import React, { useState, useRef } from 'react';
import { Sigil } from '../../icons';
import { generateSigilSvgString, hashStringToUint32 } from '../../icons/sigilGenerator';
import { CopyIcon, DownloadIcon, CheckIcon } from '../../icons';

export const SigilLab: React.FC = () => {
  const [identifier, setIdentifier] = useState<string>('192.168.1.105');
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const cleanId = identifier.trim() || 'SOC-SYSTEM';
  const numericHash = hashStringToUint32(cleanId);
  const hexHash = `0x${numericHash.toString(16).padStart(8, '0').toUpperCase()}`;

  const handleCopySvg = () => {
    const svgStr = generateSigilSvgString(cleanId, 96);
    navigator.clipboard.writeText(svgStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    const svgStr = generateSigilSvgString(cleanId, 160);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sigil-${cleanId.replace(/[^a-zA-Z0-9_-]/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const svgStr = generateSigilSvgString(cleanId, 320);
    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const URLObject = window.URL || window.webkitURL || window;
    const blobURL = URLObject.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#101214';
        ctx.fillRect(0, 0, 320, 320);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `sigil-${cleanId.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        a.click();
      }
      URLObject.revokeObjectURL(blobURL);
    };
    img.src = blobURL;
  };

  return (
    <section
      id="sigils"
      style={{
        padding: '64px 24px',
        backgroundColor: 'var(--bg-1)',
        borderTop: '1px solid var(--line)',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Deterministic Identity Generator
        </div>
        <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Sigil Laboratory
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginTop: '6px' }}>
          Every IP address and Alert ID in SignSight receives a deterministic 5x5 geometric sigil derived from FNV-1a hashing and seeded pseudo-random layout rules.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.4fr)',
          gap: '24px',
        }}
      >
        {/* Input & Control Column */}
        <div
          style={{
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div>
            <label htmlFor="sigil-lab-input" className="label-caps" style={{ display: 'block', marginBottom: '8px' }}>
              Target IP, Hostname or User String
            </label>
            <input
              id="sigil-lab-input"
              type="text"
              className="input input-mono"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 10.0.0.1, analyst, alt-940182"
              style={{ width: '100%', height: '40px', fontSize: '14px' }}
            />

            <div style={{ marginTop: '16px' }}>
              <div className="label-caps" style={{ marginBottom: '4px' }}>
                Computed 32-Bit FNV-1a Hash
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: '13px',
                  color: 'var(--accent)',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-0)',
                  border: '1px solid var(--line)',
                }}
              >
                {hexHash} ({numericHash})
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={handleCopySvg}
                className="btn btn-secondary"
                style={{ height: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                <span>{copied ? 'Copied SVG' : 'Copy SVG'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="btn btn-secondary"
                style={{ height: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DownloadIcon size={14} />
                <span>Download SVG</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                className="btn btn-secondary"
                style={{ height: '32px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <DownloadIcon size={14} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.5, borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
            <strong>Determinism Guarantee:</strong> Identical strings always generate the identical SVG glyph without external network dependencies or font loading.
          </div>
        </div>

        {/* Live Visualizations at 40px, 96px, 160px */}
        <div
          style={{
            backgroundColor: 'var(--bg-0)',
            border: '1px solid var(--line)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div className="label-caps">Multi-Scale Glyph Renderings</div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              gap: '16px',
              padding: '20px 0',
            }}
          >
            {/* 40px (Table Scale) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '8px', border: '1px solid var(--line)', backgroundColor: 'var(--bg-1)' }}>
                <Sigil id={cleanId} size={40} />
              </div>
              <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                40px (Table)
              </span>
            </div>

            {/* 96px (Inspector Scale) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--line)', backgroundColor: 'var(--bg-1)' }}>
                <Sigil id={cleanId} size={96} />
              </div>
              <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                96px (Detail View)
              </span>
            </div>

            {/* 160px (Hero Scale) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '16px', border: '1px solid var(--line)', backgroundColor: 'var(--bg-1)' }}>
                <Sigil id={cleanId} size={160} />
              </div>
              <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                160px (Hero / Token)
              </span>
            </div>
          </div>

          <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-faint)', textAlign: 'center' }}>
            Visual fingerprint for `{cleanId}`
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </section>
  );
};
