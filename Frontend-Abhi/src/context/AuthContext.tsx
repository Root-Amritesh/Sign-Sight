import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { User, UserRole } from '../types/auth';

export interface RegisterData {
  username: string;
  email?: string;
  password?: string;
  role?: 'analyst' | 'admin';
}

interface StoredAccount {
  user: User;
  password?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username?: string; email?: string; password?: string }) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  quickDemoLogin: (role?: 'analyst' | 'admin') => void;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

function createLocalJwt(user: User): string {
  const header = btoa(unescape(encodeURIComponent(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))));
  const exp = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ sub: user.username, role: user.role, exp }))));
  return `${header}.${payload}.localsig`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (api.getAccessToken() || api.getRefreshToken()) {
        const me = await api.getMe();
        setUser(me);
      } else {
        setUser(null);
      }
    } catch {
      // Keep existing local user if backend is offline
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        // 1. Check local session persistence
        const storedUser = localStorage.getItem('signsight_active_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.role) {
              const token = createLocalJwt(parsed);
              api.setAccessToken(token);
              setUser(parsed);
              setIsLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem('signsight_active_user');
          }
        }

        // 2. Otherwise attempt refresh token with backend
        const refreshToken = api.getRefreshToken();
        if (refreshToken && !api.isTokenExpired(refreshToken)) {
          try {
            const refreshRes = await api.refreshToken(refreshToken);
            api.setAccessToken(refreshRes.access);
            if (refreshRes.refresh) {
              api.setRefreshToken(refreshRes.refresh);
            }
            const me = await api.getMe();
            setUser(me);
          } catch {
            api.setAccessToken(null);
            api.setRefreshToken(null);
            setUser(null);
          }
        } else {
          api.setRefreshToken(null);
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    api.setOnSessionExpired(() => {
      setUser(null);
      try {
        localStorage.removeItem('signsight_active_user');
      } catch {
        // ignore
      }
      window.location.href = '/session-expired';
    });

    initAuth();
  }, []);

  const quickDemoLogin = (selectedRole: 'analyst' | 'admin' = 'analyst') => {
    const demoUser: User = {
      id: selectedRole === 'admin' ? 'demo-admin-01' : 'demo-analyst-01',
      username: selectedRole === 'admin' ? 'admin' : 'analyst',
      email: `${selectedRole}@signsight.internal`,
      role: selectedRole,
      date_joined: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };
    const token = createLocalJwt(demoUser);
    api.setAccessToken(token);
    api.setRefreshToken(token);
    try {
      localStorage.setItem('signsight_active_user', JSON.stringify(demoUser));
    } catch {
      // ignore
    }
    setUser(demoUser);
  };

  const register = async (data: RegisterData) => {
    const trimmedUsername = data.username.trim();
    if (!trimmedUsername) {
      throw new Error('Username is required.');
    }

    const assignedRole: 'analyst' | 'admin' = data.role === 'admin' ? 'admin' : 'analyst';
    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: trimmedUsername,
      email: data.email?.trim() || `${trimmedUsername}@signsight.internal`,
      role: assignedRole,
      date_joined: new Date().toISOString(),
      last_login: new Date().toISOString(),
    };

    // Store account in localStorage accounts collection
    try {
      const stored = localStorage.getItem('signsight_accounts');
      const accounts: StoredAccount[] = stored ? JSON.parse(stored) : [];
      const existingIdx = accounts.findIndex(
        (a) => a.user.username.toLowerCase() === trimmedUsername.toLowerCase()
      );
      if (existingIdx >= 0) {
        accounts[existingIdx] = { user: newUser, password: data.password };
      } else {
        accounts.push({ user: newUser, password: data.password });
      }
      localStorage.setItem('signsight_accounts', JSON.stringify(accounts));
    } catch {
      // storage restricted fallback
    }

    // Set active user & token
    const token = createLocalJwt(newUser);
    api.setAccessToken(token);
    api.setRefreshToken(token);
    try {
      localStorage.setItem('signsight_active_user', JSON.stringify(newUser));
    } catch {
      // ignore
    }
    setUser(newUser);
  };

  const login = async (credentials: { username?: string; email?: string; password?: string }) => {
    try {
      const res = await api.login(credentials);
      if (res.user) {
        setUser(res.user);
        try {
          localStorage.setItem('signsight_active_user', JSON.stringify(res.user));
        } catch {
          // ignore
        }
      } else {
        const me = await api.getMe();
        setUser(me);
        try {
          localStorage.setItem('signsight_active_user', JSON.stringify(me));
        } catch {
          // ignore
        }
      }
      return;
    } catch (apiErr) {
      // Fallback: check locally registered accounts and demo credentials
      const identifier = (credentials.username || credentials.email || '').trim().toLowerCase();
      const pwd = credentials.password || '';

      let foundAccount: StoredAccount | undefined;
      try {
        const stored = localStorage.getItem('signsight_accounts');
        const accounts: StoredAccount[] = stored ? JSON.parse(stored) : [];
        foundAccount = accounts.find(
          (a) =>
            a.user.username.toLowerCase() === identifier ||
            (a.user.email && a.user.email.toLowerCase() === identifier)
        );
      } catch {
        // ignore
      }

      if (foundAccount) {
        if (!foundAccount.password || foundAccount.password === pwd) {
          const userWithLogin = { ...foundAccount.user, last_login: new Date().toISOString() };
          const token = createLocalJwt(userWithLogin);
          api.setAccessToken(token);
          api.setRefreshToken(token);
          try {
            localStorage.setItem('signsight_active_user', JSON.stringify(userWithLogin));
          } catch {
            // ignore
          }
          setUser(userWithLogin);
          return;
        } else {
          throw new Error('Incorrect password for this account.');
        }
      }

      // Check standard demo credentials
      if (identifier === 'analyst' || identifier === 'analyst@signsight.internal') {
        if (!pwd || pwd === 'analyst123') {
          quickDemoLogin('analyst');
          return;
        }
      }
      if (identifier === 'admin' || identifier === 'admin@signsight.internal') {
        if (!pwd || pwd === 'admin123') {
          quickDemoLogin('admin');
          return;
        }
      }

      throw apiErr;
    }
  };

  const googleLogin = async (credential: string) => {
    const res = await api.googleLogin(credential);
    setUser(res.user);
    try {
      localStorage.setItem('signsight_active_user', JSON.stringify(res.user));
    } catch {
      // ignore
    }
  };

  const logout = () => {
    api.setAccessToken(null);
    api.setRefreshToken(null);
    try {
      localStorage.removeItem('signsight_active_user');
    } catch {
      // ignore
    }
    setUser(null);
  };

  const role: UserRole = user?.role || 'visitor';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        quickDemoLogin,
        googleLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
