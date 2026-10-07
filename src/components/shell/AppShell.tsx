import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppRail } from './AppRail';
import { StatusStrip } from './StatusStrip';
import { DemoBanner } from '../common/DemoBanner';
import { CommandPalette } from '../common/CommandPalette';
import { ShortcutsSheet } from '../common/ShortcutsSheet';
import { FirstRunTour } from '../tour/FirstRunTour';
import { useConnectivity } from '../../hooks/useConnectivity';
import { SpacecraftGame } from '../../game/SpacecraftGame';

export const AppShell: React.FC = () => {
  const { isOffline } = useConnectivity();
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [dismissOfflineOverlay, setDismissOfflineOverlay] = useState<boolean>(false);

  useEffect(() => {
    if (!isOffline) {
      setDismissOfflineOverlay(false);
    }
  }, [isOffline]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: 'var(--bg-0)' }}>
      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Global Shortcuts Reference Modal (?) */}
      <ShortcutsSheet isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* First Run Onboarding Tour */}
      <FirstRunTour />

      {/* Auto-overlay when connection is lost */}
      {isOffline && !dismissOfflineOverlay && (
        <SpacecraftGame isOverlay onClose={() => setDismissOfflineOverlay(true)} />
      )}

      <AppRail />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <StatusStrip />
        <DemoBanner />
        <main
          style={{
            flex: 1,
            padding: '20px 24px',
            overflowY: 'auto',
          }}
          id="main-content"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
