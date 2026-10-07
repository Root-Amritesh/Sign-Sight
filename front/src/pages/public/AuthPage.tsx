import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sigil } from '../../icons';
import RibbonGlow from '../../components/originkit/ui/ribbon-glow';
import { t } from '../../i18n';
import { authConfig } from '../../config/auth';
import { env } from '../../config/env';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<'analyst' | 'admin'>('analyst');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sigilKey, setSigilKey] = useState(0);

  const { login, register, quickDemoLogin, googleLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/app/dashboard';

  // If already authenticated, redirect to target
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Animate sigil whenever identifier changes
  useEffect(() => {
    setSigilKey((prev) => prev + 1);
  }, [identifier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!identifier.trim()) {
          setError('Please enter a username or analyst ID.');
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          setError('Password must be at least 4 characters long.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please re-check.');
          setLoading(false);
          return;
        }

        await register({
          username: identifier.trim(),
          email: email.trim() || `${identifier.trim()}@signsight.internal`,
          password,
          role: registerRole,
        });
        navigate(from, { replace: true });
      } else {
        const credentials: Record<string, string> = { password };
        if (authConfig.loginUsernameField === 'email' && identifier.includes('@')) {
          credentials.email = identifier.trim();
        } else {
          credentials.username = identifier.trim();
        }

        await login(credentials);
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: string; message?: string };
      setError(
        apiErr.detail ||
          apiErr.message ||
          t('auth.invalidCredentials', 'Authentication failed. Check your credentials or use 1-Click Fast Access below.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    if (!env.googleClientId) {
      setError('Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in your environment.');
      return;
    }
    try {
      const win = window as any;
      if (win.google?.accounts?.id) {
        win.google.accounts.id.initialize({
          client_id: env.googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true);
              try {
                await googleLogin(response.credential);
                navigate(from, { replace: true });
              } catch (err: any) {
                setError(err?.detail || err?.message || 'Google authentication failed.');
              } finally {
                setLoading(false);
              }
            }
          },
        });
        win.google.accounts.id.prompt();
      } else {
        setError('Google Identity Services SDK is not loaded. Please verify your connection.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google authentication.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-0)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ribbon Glow Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          opacity: 0.4,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <RibbonGlow
          background="#0A0B0C"
          color1="#B6FF3B"
          color2="#3B82F6"
          speed={45}
          size={110}
          angle={-45}
          hover={90}
          reach={280}
          style={{
            minWidth: 'unset',
            minHeight: 'unset',
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '860px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(380px, 1.4fr)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Left Quiet Panel with Animated Username Sigil */}
        <div
          style={{
            backgroundColor: 'var(--bg-2)',
            borderRight: '1px solid var(--line)',
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div>
            <div className="label-caps" style={{ marginBottom: '8px', color: 'var(--accent)' }}>
              IDENTITY TOKEN
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
              Deterministic cryptographic sigil
            </div>
          </div>

          <div
            key={sigilKey}
            style={{
              padding: '24px',
              border: '1px solid var(--line)',
              backgroundColor: 'var(--bg-0)',
              animation: 'sigil-enter 160ms ease-out',
            }}
          >
            <Sigil
              id={identifier.trim() || (mode === 'register' ? 'NEW-ACCOUNT' : 'SOC-ANALYST')}
              size={104}
              showHash
            />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-faint)', maxWidth: '240px', lineHeight: 1.5 }}>
            {mode === 'register'
              ? 'New identity hash auto-derives from your unique identifier in real-time.'
              : 'HMAC hash derived from analyst identity token.'}
          </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Header & Mode Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
                <h1 className="font-display" style={{ fontSize: '18px', color: 'var(--text)', margin: 0 }}>
                  SignSight Console
                </h1>
              </div>

              <span className="font-mono label-caps" style={{ color: 'var(--accent)', fontSize: '11px' }}>
                {mode === 'register' ? 'PROVISIONING' : 'JWT AUTH'}
              </span>
            </div>

            {/* Mode Switch Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                border: '1px solid var(--line)',
                marginBottom: '20px',
                backgroundColor: 'var(--bg-0)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: mode === 'signin' ? 'var(--bg-2)' : 'transparent',
                  color: mode === 'signin' ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: mode === 'signin' ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: mode === 'register' ? 'var(--bg-2)' : 'transparent',
                  color: mode === 'register' ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: mode === 'register' ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                + Create New Account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--sev-critical-bg)',
                  border: '1px solid var(--sev-critical)',
                  color: 'var(--sev-critical)',
                  fontSize: '12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span className="font-mono" style={{ fontWeight: 600 }}>ALERT:</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                  {mode === 'register' ? 'Choose Username / ID' : 'Username / ID'}
                </label>
                <input
                  type="text"
                  className="input input-mono"
                  placeholder={mode === 'register' ? 'e.g. jdoe_analyst' : 'analyst or admin'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      className="input input-mono"
                      placeholder="analyst@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                      Security Clearance Role
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setRegisterRole('analyst')}
                        className={registerRole === 'analyst' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ height: '32px', fontSize: '11px' }}
                      >
                        SOC Analyst
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterRole('admin')}
                        className={registerRole === 'admin' ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ height: '32px', fontSize: '11px' }}
                      >
                        SOC Administrator
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  className="input input-mono"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="input input-mono"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: '38px', marginTop: '6px', width: '100%', fontSize: '13px' }}
                disabled={loading}
              >
                {loading
                  ? 'Processing Authorization...'
                  : mode === 'register'
                  ? '✓ Create Account & Enter Console'
                  : t('auth.submitSignIn', 'Sign In to Console')}
              </button>

              {/* 1-Click Demo / Fast-Track Access */}
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px dashed var(--line)',
                }}
              >
                <div
                  className="label-caps"
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>⚡ 1-Click Fast Access (No Form Needed)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      quickDemoLogin('analyst');
                      navigate(from, { replace: true });
                    }}
                    className="btn btn-secondary"
                    style={{ height: '32px', fontSize: '11px', gap: '6px' }}
                    title="Sign in immediately as Analyst"
                  >
                    <span>Analyst Access</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      quickDemoLogin('admin');
                      navigate(from, { replace: true });
                    }}
                    className="btn btn-secondary"
                    style={{ height: '32px', fontSize: '11px', gap: '6px' }}
                    title="Sign in immediately as Admin"
                  >
                    <span>Admin Access</span>
                  </button>
                </div>
              </div>

              {/* Social / SSO Buttons (Shown in Sign In mode) */}
              {mode === 'signin' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="btn btn-secondary"
                    style={{ height: '34px', width: '100%', gap: '8px', fontSize: '11px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Google SSO</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const entraEnabled = import.meta.env.VITE_ENABLE_ENTRA === 'true';
                      if (!entraEnabled) {
                        setError('Microsoft Entra ID is not enabled. Set VITE_ENABLE_ENTRA=true when backend support is available.');
                        return;
                      }
                      try {
                        const { initiateEntraLogin } = await import('../../auth/msal');
                        await initiateEntraLogin();
                      } catch (err: unknown) {
                        setError((err as Error).message);
                      }
                    }}
                    className="btn btn-secondary"
                    style={{ height: '34px', width: '100%', gap: '8px', fontSize: '11px' }}
                    title="Sign in with Microsoft Entra ID"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="9" height="9" fill="#F25022" />
                      <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
                      <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
                      <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
                    </svg>
                    <span>Entra ID</span>
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Footer terms / connection link */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '12px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--text-faint)',
            }}
          >
            <Link to="/app/connection" style={{ color: 'var(--accent)' }}>Diagnostic Connection Hub &rarr;</Link>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link to="/terms" style={{ color: 'var(--text-faint)' }}>Terms</Link>
              <Link to="/privacy" style={{ color: 'var(--text-faint)' }}>Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
