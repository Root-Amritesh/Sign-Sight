import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function useConnectivity() {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isBackendOffline, setIsBackendOffline] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setWasOffline(true);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Health ping loop checks backend availability without hijacking the app
    const pingInterval = setInterval(async () => {
      if (!navigator.onLine) {
        setIsOffline(true);
        return;
      }
      try {
        await api.getHealth();
        setIsBackendOffline(false);
      } catch {
        setIsBackendOffline(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
    };
  }, []);

  return {
    isOffline,
    isBackendOffline,
    wasOffline,
    clearWasOffline: () => setWasOffline(false),
  };
}
