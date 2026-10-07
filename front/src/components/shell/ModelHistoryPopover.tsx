import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ModelIcon } from '../../icons';

interface ModelHistoryPopoverProps {
  version: string;
}

export const ModelHistoryPopover: React.FC<ModelHistoryPopoverProps> = ({ version }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          padding: '2px 6px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--text)',
        }}
        title="View Model Deployment Details"
        aria-expanded={isOpen}
      >
        <span className="font-mono" style={{ color: 'var(--accent)', textDecoration: 'underline dotted' }}>
          {version}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: '0',
            width: '280px',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--line-strong)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            padding: '16px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
            <ModelIcon size={16} />
            <span className="font-display" style={{ fontSize: '13px', color: 'var(--text)' }}>
              Active Inference Pipeline
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Architecture:</span>
              <span className="font-mono" style={{ color: 'var(--text)' }}>IsolationForest + LGBM</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Version Tag:</span>
              <span className="font-mono" style={{ color: 'var(--accent)' }}>{version}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Macro F1 Score:</span>
              <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>0.958</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">Baseline Size:</span>
              <span className="font-mono" style={{ color: 'var(--text-dim)' }}>125,973 samples</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label-caps">SHA256:</span>
              <span className="font-mono" style={{ color: 'var(--text-dim)', fontSize: '10px' }}>
                9f8a...3b21
              </span>
            </div>
          </div>

          <Link
            to="/app/model"
            onClick={() => setIsOpen(false)}
            className="btn btn-secondary"
            style={{ textAlign: 'center', height: '26px', fontSize: '11px', textDecoration: 'none' }}
          >
            Open Model Health Dashboard &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};
