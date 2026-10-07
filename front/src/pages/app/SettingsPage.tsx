import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { t } from '../../i18n';
import type { UIThresholdsConfig } from '../../api/adapters/config';
import { EmptyState } from '../../components/common/EmptyState';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    data: initialConfig,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['thresholdsConfig'],
    queryFn: () => api.getThresholdsConfig(),
  });

  const [config, setConfig] = useState<UIThresholdsConfig | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(JSON.parse(JSON.stringify(initialConfig)));
    }
  }, [initialConfig]);

  const saveMutation = useMutation({
    mutationFn: async (updated: UIThresholdsConfig) => {
      return api.updateThresholdsConfig(updated);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['thresholdsConfig'], saved);
      setConfig(JSON.parse(JSON.stringify(saved)));
      addToast('Alert thresholds configuration successfully updated in backend.');
      setShowDiffModal(false);
    },
    onError: (err: any) => {
      const detail = err?.detail || err?.message || 'Failed to update alert thresholds.';
      addToast(`Update rejected: ${detail}`, 'error');
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
        <div className="skeleton" style={{ height: '32px', width: '280px' }} />
        <div className="skeleton" style={{ height: '240px', width: '100%' }} />
        <div className="skeleton" style={{ height: '180px', width: '100%' }} />
      </div>
    );
  }

  if (isError || !config || !initialConfig) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto' }}>
        <EmptyState
          title="Threshold Configuration Unavailable"
          description={
            (error as any)?.status === 403
              ? 'Admin role required to view or update alert thresholds.'
              : (error as any)?.detail || 'Could not retrieve configuration from GET /api/config/alert-thresholds/.'
          }
          actionLabel="Retry Connection"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  // Calculate live threshold split preview
  const critCut = config.severityTiers.critical.minConfidence;
  const highCut = config.severityTiers.high.minConfidence;
  const medCut = config.severityTiers.medium.minConfidence;
  const lowCut = config.severityTiers.low.minConfidence;

  const critWidth = Math.max(0, (1.0 - critCut) * 100);
  const highWidth = Math.max(0, (critCut - highCut) * 100);
  const medWidth = Math.max(0, (highCut - medCut) * 100);
  const lowWidth = Math.max(0, (medCut - lowCut) * 100);
  const unclassifiedWidth = Math.max(0, lowCut * 100);

  // Compute diffs for confirmation modal
  const diffs: { field: string; from: string | number | boolean; to: string | number | boolean }[] = [];

  if (config.minConfidenceToAlert !== initialConfig.minConfidenceToAlert) {
    diffs.push({ field: 'min_confidence_to_alert', from: initialConfig.minConfidenceToAlert, to: config.minConfidenceToAlert });
  }
  if (config.normalUncertaintyThreshold !== initialConfig.normalUncertaintyThreshold) {
    diffs.push({ field: 'normal_uncertainty_threshold', from: initialConfig.normalUncertaintyThreshold, to: config.normalUncertaintyThreshold });
  }
  if (config.noveltyThreshold !== initialConfig.noveltyThreshold) {
    diffs.push({ field: config.detectedKey, from: initialConfig.noveltyThreshold, to: config.noveltyThreshold });
  }
  if (config.noveltySeverity !== initialConfig.noveltySeverity) {
    diffs.push({ field: 'novelty_severity', from: initialConfig.noveltySeverity, to: config.noveltySeverity });
  }
  if (config.severityTiers.critical.minConfidence !== initialConfig.severityTiers.critical.minConfidence) {
    diffs.push({ field: 'severity_tiers.critical', from: initialConfig.severityTiers.critical.minConfidence, to: config.severityTiers.critical.minConfidence });
  }
  if (config.severityTiers.high.minConfidence !== initialConfig.severityTiers.high.minConfidence) {
    diffs.push({ field: 'severity_tiers.high', from: initialConfig.severityTiers.high.minConfidence, to: config.severityTiers.high.minConfidence });
  }
  if (config.severityTiers.medium.minConfidence !== initialConfig.severityTiers.medium.minConfidence) {
    diffs.push({ field: 'severity_tiers.medium', from: initialConfig.severityTiers.medium.minConfidence, to: config.severityTiers.medium.minConfidence });
  }
  if (config.severityTiers.low.minConfidence !== initialConfig.severityTiers.low.minConfidence) {
    diffs.push({ field: 'severity_tiers.low', from: initialConfig.severityTiers.low.minConfidence, to: config.severityTiers.low.minConfidence });
  }
  if (config.attackTypeSeverityBoost.u2r !== initialConfig.attackTypeSeverityBoost.u2r) {
    diffs.push({ field: 'boosts.u2r', from: initialConfig.attackTypeSeverityBoost.u2r, to: config.attackTypeSeverityBoost.u2r });
  }
  if (config.attackTypeSeverityBoost.r2l !== initialConfig.attackTypeSeverityBoost.r2l) {
    diffs.push({ field: 'boosts.r2l', from: initialConfig.attackTypeSeverityBoost.r2l, to: config.attackTypeSeverityBoost.r2l });
  }
  if (config.attackTypeSeverityBoost.dos !== initialConfig.attackTypeSeverityBoost.dos) {
    diffs.push({ field: 'boosts.dos', from: initialConfig.attackTypeSeverityBoost.dos, to: config.attackTypeSeverityBoost.dos });
  }
  if (config.attackTypeSeverityBoost.probe !== initialConfig.attackTypeSeverityBoost.probe) {
    diffs.push({ field: 'boosts.probe', from: initialConfig.attackTypeSeverityBoost.probe, to: config.attackTypeSeverityBoost.probe });
  }
  if (JSON.stringify(config.notificationSeverities) !== JSON.stringify(initialConfig.notificationSeverities)) {
    diffs.push({
      field: 'notification_severities',
      from: initialConfig.notificationSeverities.join(', '),
      to: config.notificationSeverities.join(', '),
    });
  }

  const toggleNotificationSeverity = (sev: string) => {
    const current = new Set(config.notificationSeverities);
    if (current.has(sev)) {
      current.delete(sev);
    } else {
      current.add(sev);
    }
    setConfig({ ...config, notificationSeverities: Array.from(current) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
              {t('settings.title', 'Alert Thresholds & Pipeline Configuration')}
            </h1>
            <span
              className="sev-tag"
              style={{
                borderColor: isAdmin ? 'var(--accent)' : 'var(--text-faint)',
                color: isAdmin ? 'var(--accent)' : 'var(--text-faint)',
              }}
            >
              {isAdmin ? 'ADMIN ACCESS' : 'READ ONLY (ANALYST)'}
            </span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Contract endpoints: <code className="font-mono">GET /api/config/alert-thresholds/</code> and <code className="font-mono">PUT /api/config/alert-thresholds/</code>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ height: '34px' }}
            onClick={() => setShowDiffModal(true)}
            disabled={diffs.length === 0}
          >
            {t('settings.saveConfig', 'Review & Commit Changes')} ({diffs.length})
          </button>
        )}
      </div>

      {/* Threshold Split Preview */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="label-caps">{t('settings.previewCutoffs', 'Live Threshold Distribution Preview')}</span>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Range: 0.00 &rarr; 1.00 Score Scale
          </span>
        </div>

        {/* Proportional Stacked Preview Bar */}
        <div
          style={{
            height: '24px',
            display: 'flex',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--bg-2)',
            marginBottom: '8px',
            borderRadius: 'var(--radius-xs)',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${unclassifiedWidth}%`, backgroundColor: 'var(--bg-3)', opacity: 0.6 }} title="Below Low" />
          <div style={{ width: `${lowWidth}%`, backgroundColor: 'var(--sev-low)', opacity: 0.85 }} title="Low Tier" />
          <div style={{ width: `${medWidth}%`, backgroundColor: 'var(--sev-medium)', opacity: 0.85 }} title="Medium Tier" />
          <div style={{ width: `${highWidth}%`, backgroundColor: 'var(--sev-high)', opacity: 0.85 }} title="High Tier" />
          <div style={{ width: `${critWidth}%`, backgroundColor: 'var(--sev-critical)', opacity: 0.85 }} title="Critical Tier" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)' }}>
          <span>Low: &ge; {lowCut.toFixed(2)}</span>
          <span>Medium: &ge; {medCut.toFixed(2)}</span>
          <span>High: &ge; {highCut.toFixed(2)}</span>
          <span style={{ color: 'var(--sev-critical)', fontWeight: 600 }}>Critical: &ge; {critCut.toFixed(2)}</span>
        </div>
      </div>

      {/* Severity Tiers Form */}
      <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="label-caps">Severity Tier Min Confidence</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>
          Minimum model confidence thresholds required for each severity assignment.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px', color: 'var(--sev-critical)' }}>
              Critical Tier
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.severityTiers.critical.minConfidence}
              onChange={(e) =>
                setConfig({
                  ...config,
                  severityTiers: {
                    ...config.severityTiers,
                    critical: { minConfidence: parseFloat(e.target.value) || 0 },
                  },
                })
              }
            />
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px', color: 'var(--sev-high)' }}>
              High Tier
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.severityTiers.high.minConfidence}
              onChange={(e) =>
                setConfig({
                  ...config,
                  severityTiers: {
                    ...config.severityTiers,
                    high: { minConfidence: parseFloat(e.target.value) || 0 },
                  },
                })
              }
            />
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px', color: 'var(--sev-medium)' }}>
              Medium Tier
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.severityTiers.medium.minConfidence}
              onChange={(e) =>
                setConfig({
                  ...config,
                  severityTiers: {
                    ...config.severityTiers,
                    medium: { minConfidence: parseFloat(e.target.value) || 0 },
                  },
                })
              }
            />
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px', color: 'var(--sev-low)' }}>
              Low Tier
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.severityTiers.low.minConfidence}
              onChange={(e) =>
                setConfig({
                  ...config,
                  severityTiers: {
                    ...config.severityTiers,
                    low: { minConfidence: parseFloat(e.target.value) || 0 },
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Anomaly & Novelty Configuration */}
      <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="label-caps">Anomaly Screening & Novelty Parameters</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
              Min Confidence to Alert
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.minConfidenceToAlert}
              onChange={(e) => setConfig({ ...config, minConfidenceToAlert: parseFloat(e.target.value) || 0 })}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Alerts below this confidence are discarded.
            </span>
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
              Normal Uncertainty Threshold
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.normalUncertaintyThreshold}
              onChange={(e) => setConfig({ ...config, normalUncertaintyThreshold: parseFloat(e.target.value) || 0 })}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              If normal class probability is below this, flagged for anomaly review.
            </span>
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
              Novelty Threshold ({config.detectedKey})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.noveltyThreshold}
              onChange={(e) => setConfig({ ...config, noveltyThreshold: parseFloat(e.target.value) || 0 })}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Isolation Forest score threshold for zero-day/novel flags.
            </span>
          </div>

          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
              Novelty Default Severity
            </label>
            <select
              className="select"
              disabled={!isAdmin}
              value={config.noveltySeverity}
              onChange={(e) => setConfig({ ...config, noveltySeverity: e.target.value as any })}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Severity assigned to novel suspicious flows.
            </span>
          </div>
        </div>
      </div>

      {/* Attack Family Boosts */}
      <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="label-caps">Attack Family Severity Boosts</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>
          Additive weighting applied based on attack family risk profile.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>DoS Boost</label>
            <input
              type="number"
              step="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.attackTypeSeverityBoost.dos}
              onChange={(e) =>
                setConfig({
                  ...config,
                  attackTypeSeverityBoost: {
                    ...config.attackTypeSeverityBoost,
                    dos: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
            />
          </div>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>Probe Boost</label>
            <input
              type="number"
              step="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.attackTypeSeverityBoost.probe}
              onChange={(e) =>
                setConfig({
                  ...config,
                  attackTypeSeverityBoost: {
                    ...config.attackTypeSeverityBoost,
                    probe: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
            />
          </div>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>R2L Boost</label>
            <input
              type="number"
              step="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.attackTypeSeverityBoost.r2l}
              onChange={(e) =>
                setConfig({
                  ...config,
                  attackTypeSeverityBoost: {
                    ...config.attackTypeSeverityBoost,
                    r2l: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
            />
          </div>
          <div>
            <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>U2R Boost</label>
            <input
              type="number"
              step="1"
              disabled={!isAdmin}
              className="input input-mono"
              value={config.attackTypeSeverityBoost.u2r}
              onChange={(e) =>
                setConfig({
                  ...config,
                  attackTypeSeverityBoost: {
                    ...config.attackTypeSeverityBoost,
                    u2r: parseInt(e.target.value, 10) || 0,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Notification Severities */}
      <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="label-caps">Notification Dispatch Severities</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>
          Severities that trigger outbound notifications and webhooks.
        </p>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {['critical', 'high', 'medium', 'low', 'info'].map((sev) => (
            <label
              key={sev}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isAdmin ? 'pointer' : 'default',
                fontSize: '13px',
                textTransform: 'capitalize',
              }}
            >
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={config.notificationSeverities.includes(sev)}
                onChange={() => toggleNotificationSeverity(sev)}
              />
              <span>{sev}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Diff Confirmation Modal */}
      {showDiffModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 11, 12, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '24px',
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              border: '1px solid var(--line-strong)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-caps" style={{ color: 'var(--accent)' }}>
                CONFIRM CONFIGURATION MUTATION
              </span>
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '18px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
              The following parameters will be written via <code className="font-mono">PUT /api/config/alert-thresholds/</code>:
            </p>

            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Previous</th>
                    <th>New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d) => (
                    <tr key={d.field}>
                      <td className="font-mono" style={{ fontSize: '12px' }}>{d.field}</td>
                      <td className="font-mono tabular-nums" style={{ color: 'var(--text-faint)', fontSize: '12px' }}>
                        {String(d.from)}
                      </td>
                      <td className="font-mono tabular-nums" style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 600 }}>
                        {String(d.to)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowDiffModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(config)}
              >
                {saveMutation.isPending ? 'Saving...' : 'Confirm & Commit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
