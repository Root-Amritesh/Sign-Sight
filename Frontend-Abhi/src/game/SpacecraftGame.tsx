import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameEngine } from './engine';
import { sound } from './audio';
import type { GameState } from './types';
import { useConnectivity } from '../hooks/useConnectivity';
import { t } from '../i18n';

interface SpacecraftGameProps {
  onClose?: () => void;
  isOverlay?: boolean;
}

export const SpacecraftGame: React.FC<SpacecraftGameProps> = ({ onClose, isOverlay }) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const { wasOffline, clearWasOffline } = useConnectivity();
  const [soundActive, setSoundActive] = useState(sound.isEnabled());
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    wave: 1,
    comboMultiplier: 1,
    comboHits: 0,
    killsByFamily: { dos: 0, probe: 0, r2l: 0, u2r: 0, normal: 0 },
    isPaused: false,
    isGameOver: false,
    highScore: 0,
    lastRuns: [],
  });

  const handleExit = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/app/dashboard');
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const width = Math.min(900, window.innerWidth - 32);
    const height = Math.min(640, window.innerHeight - 120);

    const engine = new GameEngine(
      canvas,
      (newState) => setGameState(newState),
      handleExit
    );
    engine.setDimensions(width, height);
    engine.start();
    engineRef.current = engine;

    const handleResize = () => {
      const nw = Math.min(900, window.innerWidth - 32);
      const nh = Math.min(640, window.innerHeight - 120);
      engine.setDimensions(nw, nh);
    };

    const handleAudioKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const next = !sound.isEnabled();
        sound.setEnabled(next);
        setSoundActive(next);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleAudioKey);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleAudioKey);
      engine.destroy();
    };
  }, []);

  const toggleSound = () => {
    const next = !soundActive;
    sound.setEnabled(next);
    setSoundActive(next);
  };

  return (
    <div
      style={{
        position: isOverlay ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: isOverlay ? '100vh' : 'calc(100vh - 40px)',
        backgroundColor: 'var(--bg-0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: isOverlay ? 9999 : 1,
        padding: '16px',
        color: 'var(--text)',
      }}
    >
      {/* Top Reconnect Notice Banner */}
      {wasOffline && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--accent)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>BACK ONLINE:</span>
          <span>Connection restored. Finish your run or press Esc to return.</span>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: '22px', fontSize: '10px' }}
            onClick={() => { clearWasOffline(); handleExit(); }}
          >
            Return to Console
          </button>
        </div>
      )}

      {/* Game Title & Status Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-display" style={{ fontSize: '16px', color: 'var(--accent)' }}>
            {t('offline.title', 'SIGNAL LOST')}
          </span>
          <span className="label-caps" style={{ color: 'var(--text-dim)' }}>
            Offline Defense Protocol
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={toggleSound}
            className="btn btn-secondary"
            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            {soundActive ? 'Sound: ON' : 'Sound: OFF'}
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="btn btn-secondary"
            style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
          >
            Exit (Esc)
          </button>
        </div>
      </div>

      {/* Canvas Wrap */}
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--line-strong)',
          backgroundColor: '#0A0B0C',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', touchAction: 'none' }}
        />

        {/* Paused Overlay */}
        {gameState.isPaused && !gameState.isGameOver && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10, 11, 12, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <div className="font-display" style={{ fontSize: '28px', color: 'var(--accent)' }}>
              SYSTEM PAUSED
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
              Press P or click Resume to continue
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: '36px', padding: '0 20px' }}
              onClick={() => engineRef.current?.togglePause()}
            >
              Resume Defense
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState.isGameOver && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10, 11, 12, 0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '18px',
              padding: '24px',
            }}
          >
            <div className="font-mono" style={{ fontSize: '36px', color: 'var(--sev-critical)', fontWeight: 700 }}>
              DEFENSE COMPROMISED
            </div>

            <div
              className="panel"
              style={{
                padding: '16px 24px',
                minWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid var(--line-strong)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span className="label-caps">Final Score:</span>
                <span className="font-mono tabular-nums" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  {gameState.score.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span className="label-caps">Wave Reached:</span>
                <span className="font-mono tabular-nums">{gameState.wave}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span className="label-caps">High Score:</span>
                <span className="font-mono tabular-nums">{gameState.highScore.toLocaleString()}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', marginTop: '8px', paddingTop: '8px' }}>
                <div className="label-caps" style={{ marginBottom: '6px' }}>Threats Neutralized</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                  <span className="font-mono">DoS: {gameState.killsByFamily.dos}</span>
                  <span className="font-mono">Probe: {gameState.killsByFamily.probe}</span>
                  <span className="font-mono">R2L: {gameState.killsByFamily.r2l}</span>
                  <span className="font-mono">U2R: {gameState.killsByFamily.u2r}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: '36px', padding: '0 20px' }}
                onClick={() => engineRef.current?.restart()}
              >
                Deploy Again
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '36px', padding: '0 20px' }}
                onClick={handleExit}
              >
                Exit to Console
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Help */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          marginTop: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: 'var(--text-faint)',
        }}
      >
        <div>
          Controls: <span className="font-mono">[WASD / Arrows]</span> Move &bull; <span className="font-mono">[Space]</span> Hold Fire &bull; <span className="font-mono">[P]</span> Pause &bull; <span className="font-mono">[M]</span> Audio
        </div>
        <div>
          Mobile: Drag to pilot &bull; Auto-fire on &bull; 2-finger tap pauses
        </div>
      </div>
    </div>
  );
};
