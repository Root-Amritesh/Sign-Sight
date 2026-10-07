import React, { useState } from 'react';
import type { UIAlertDetail } from '../../api/adapters/alerts';
import { Sigil } from '../../icons';
import { CloseIcon, CopyIcon, CheckIcon } from '../../icons';

interface TeamsCardPreviewProps {
  alert: UIAlertDetail;
  onClose?: () => void;
}

export const TeamsCardPreview: React.FC<TeamsCardPreviewProps> = ({ alert, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Construct standard Teams Adaptive Card JSON payload representation matching API_SPEC.md §3.1
  const cardPayload = {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: `🚨 ${alert.severity.toUpperCase()} Alert — ${alert.predictedLabel.toUpperCase()} Attack Detected`,
              weight: 'bolder',
              size: 'large',
              color: alert.severity === 'critical' || alert.severity === 'high' ? 'attention' : 'default',
            },
            {
              type: 'FactSet',
              facts: [
                { title: 'Alert ID', value: alert.id },
                { title: 'Attack Type', value: alert.predictedLabel },
                { title: 'Confidence', value: `${(alert.confidence * 100).toFixed(1)}%` },
                { title: 'Model', value: alert.modelVersion },
                { title: 'Time', value: alert.createdAt },
              ],
            },
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'View in Dashboard',
              url: `${window.location.origin}/app/alerts/${alert.id}`,
            },
          ],
        },
      },
    ],
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(cardPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-1)',
        border: '1px solid var(--line-strong)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="label-caps" style={{ color: 'var(--text)' }}>
            Preview of the backend&apos;s Teams notification
          </span>
          <span className="badge-mono" style={{ fontSize: '10px' }}>
            ADAPTIVE CARD v1.4
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={copyJson}
            className="btn btn-secondary"
            style={{ height: '24px', fontSize: '11px', padding: '0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Copy Adaptive Card JSON"
          >
            {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ height: '24px', width: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close preview"
            >
              <CloseIcon size={12} />
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
        Rendered from real alert metadata matching the backend webhook layout. Webhook is dispatched server-side on Critical/High alerts.
      </div>

      {/* Styled Teams Adaptive Card Container */}
      <div
        style={{
          backgroundColor: '#1B1D21',
          border: '1px solid #30363D',
          borderLeft: `4px solid ${
            alert.severity === 'critical'
              ? 'var(--sev-critical)'
              : alert.severity === 'high'
              ? 'var(--sev-high)'
              : 'var(--accent)'
          }`,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sigil id={alert.id} size={28} severity={alert.severity} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
              🚨 {alert.severity.toUpperCase()} Alert — {alert.predictedLabel.toUpperCase()} Attack Detected
            </div>
            <div className="font-mono" style={{ fontSize: '11px', color: '#9DA7B3' }}>
              Alert ID: {alert.id}
            </div>
          </div>
        </div>

        {/* Fact grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            backgroundColor: '#121417',
            padding: '10px 12px',
            border: '1px solid #23282E',
            fontSize: '11px',
          }}
        >
          <div>
            <span style={{ color: '#8B949E' }}>Severity: </span>
            <span
              className="font-mono"
              style={{
                color:
                  alert.severity === 'critical'
                    ? 'var(--sev-critical)'
                    : alert.severity === 'high'
                    ? 'var(--sev-high)'
                    : 'var(--accent)',
                fontWeight: 600,
              }}
            >
              {alert.severity.toUpperCase()}
            </span>
          </div>
          <div>
            <span style={{ color: '#8B949E' }}>Attack Type: </span>
            <span className="font-mono" style={{ color: '#F0F6FC' }}>
              {alert.predictedLabel.toUpperCase()}
            </span>
          </div>
          <div>
            <span style={{ color: '#8B949E' }}>Confidence: </span>
            <span className="font-mono" style={{ color: '#F0F6FC' }}>
              {(alert.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span style={{ color: '#8B949E' }}>Model: </span>
            <span className="font-mono" style={{ color: '#F0F6FC' }}>
              {alert.modelVersion}
            </span>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: '#8B949E' }}>Time: </span>
            <span className="font-mono" style={{ color: '#F0F6FC' }}>
              {new Date(alert.createdAt).toUTCString()}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <a
            href={`/app/alerts/${alert.id}`}
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              backgroundColor: '#3B4252',
              color: '#ECEFF4',
              fontSize: '12px',
              fontWeight: 500,
              textDecoration: 'none',
              border: '1px solid #4C566A',
            }}
          >
            View in Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};
