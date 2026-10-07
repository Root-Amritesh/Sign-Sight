import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { DeployIcon, RollbackIcon } from '../../icons';
import { useToast } from '../../components/common/Toast';
import { Glyph } from '../../icons/glyphs';
import type { ModelVersion } from '../../types/api';

export const ModelRegistryPage: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [confirmModal, setConfirmModal] = useState<{
    action: 'deploy' | 'rollback';
    version: ModelVersion;
  } | null>(null);

  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [lastActionAudit, setLastActionAudit] = useState<{
    version: string;
    action: string;
    timestamp: string;
  } | null>(null);

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['modelVersions'],
    queryFn: () => api.getModelsList(),
  });

  const versions = response?.models || [];
  const activeVersion = response?.activeVersion;

  const actionMutation = useMutation({
    mutationFn: async ({ action, version }: { action: 'deploy' | 'rollback'; version: string }) => {
      if (action === 'deploy') {
        return api.deployModel(version);
      }
      return api.rollbackModel(version);
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modelVersions'] });
      queryClient.invalidateQueries({ queryKey: ['modelMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
      setLastActionAudit({
        version: variables.version,
        action: variables.action === 'deploy' ? 'model.deployed' : 'model.rolled_back',
        timestamp: new Date().toISOString(),
      });
      addToast(res.message || `Model version ${variables.version} ${variables.action}ed successfully.`);
      setConfirmModal(null);
      setTypedConfirmation('');
    },
    onError: (err: unknown) => {
      const errObj = err as { detail?: string };
      addToast(errObj.detail || 'Model action failed: server rejected the request.', 'error');
    },
  });

  const handleOpenConfirm = (action: 'deploy' | 'rollback', version: ModelVersion) => {
    setConfirmModal({ action, version });
    setTypedConfirmation('');
  };

  const handleExecuteAction = () => {
    if (!confirmModal) return;
    if (typedConfirmation.trim() !== confirmModal.version.version) {
      addToast('Confirmation version string does not match.', 'error');
      return;
    }
    actionMutation.mutate({
      action: confirmModal.action,
      version: confirmModal.version.version,
    });
  };

  if (role !== 'admin') {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <Glyph name="warning" size={32} />
        <h1 style={{ fontSize: '18px', color: 'var(--sev-high)', margin: '12px 0 6px 0' }}>
          Admin Privileges Required
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px auto' }}>
          The Model Registry allows hot-swapping and rolling back live inference pipelines. Only administrators can perform model lifecycle actions.
        </p>
        <Link to="/app/dashboard" className="btn btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
              Model Version Registry
            </h1>
            <span className="sev-tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
              ADMIN PRIVILEGE
            </span>
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Production pipeline lifecycle: Hot-swap deployment (11 validation checks) &bull; Deterministic rollback
          </div>
        </div>
      </div>

      {/* Audit feedback banner if action was performed */}
      {lastActionAudit && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--bg-1)',
            border: '1px solid var(--accent)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          <div>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>ACTION LOGGED: </span>
            <span>
              {lastActionAudit.action} &rarr; version {lastActionAudit.version}
            </span>
          </div>
          <Link to="/app/audit" className="font-mono" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            View in Audit Log &rarr;
          </Link>
        </div>
      )}

      {/* Versions Table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Trained Model Artifacts</span>
          <span className="label-caps">
            Active: <span style={{ color: 'var(--accent)' }}>{activeVersion || 'None'}</span>
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
            <div className="skeleton" style={{ height: '36px', width: '100%' }} />
          </div>
        ) : isError ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ color: 'var(--sev-critical)', fontSize: '13px', marginBottom: '8px' }}>
              Failed to load model registry from backend.
            </div>
            <button onClick={() => refetch()} className="btn-secondary" style={{ padding: '6px 14px' }}>
              Retry
            </button>
          </div>
        ) : versions.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
            No model versions registered in backend database. Place model artifacts in <code>ml_artifacts/models/v&#123;N&#125;/</code> on the backend.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Model Architecture</th>
                  <th>Dataset</th>
                  <th style={{ textAlign: 'right' }}>Accuracy</th>
                  <th style={{ textAlign: 'right' }}>AUC-ROC</th>
                  <th style={{ textAlign: 'right' }}>Deployed At</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((ver) => {
                  const isActive = ver.isActive || ver.version === activeVersion;
                  return (
                    <tr key={ver.version}>
                      <td className="font-mono" style={{ fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--text)' }}>
                        {ver.version}
                      </td>
                      <td>
                        <span
                          className="badge-mono"
                          style={{
                            color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                            borderColor: isActive ? 'var(--accent)' : 'var(--line)',
                          }}
                        >
                          {isActive ? 'ACTIVE IN-MEMORY' : 'STANDBY ARTIFACT'}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {ver.modelType}
                      </td>
                      <td className="font-mono" style={{ fontSize: '12px' }}>
                        {ver.dataset}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                        {ver.accuracy !== undefined ? `${(ver.accuracy * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono tabular-nums">
                        {ver.aucMacro !== undefined ? ver.aucMacro.toFixed(3) : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontSize: '11px' }} className="font-mono">
                        {ver.deployedAt ? new Date(ver.deployedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {!isActive ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleOpenConfirm('deploy', ver)}
                              style={{ height: '24px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <DeployIcon size={12} />
                              <span>Deploy Hot-Swap</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleOpenConfirm('rollback', ver)}
                              style={{ height: '24px', fontSize: '11px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Rollback to previous validated model"
                            >
                              <RollbackIcon size={12} />
                              <span>Rollback</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 11, 12, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            className="panel"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              border: '1px solid var(--line-strong)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Glyph name="warning" size={18} />
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>
                Confirm {confirmModal.action === 'deploy' ? 'Model Deployment' : 'Model Rollback'}
              </h2>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>
              You are about to {confirmModal.action} model version{' '}
              <strong className="font-mono" style={{ color: 'var(--accent)' }}>
                {confirmModal.version.version}
              </strong>
              . The backend will execute an 11-step validation check (SHA-256 integrity, golden sample replay, library compatibility).
            </div>

            <div>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                Type <span style={{ color: 'var(--text)' }}>{confirmModal.version.version}</span> to confirm:
              </label>
              <input
                type="text"
                className="input-custom"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder={confirmModal.version.version}
                style={{ width: '100%', height: '32px' }}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmModal(null)}
                disabled={actionMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteAction}
                disabled={
                  typedConfirmation.trim() !== confirmModal.version.version ||
                  actionMutation.isPending
                }
              >
                {actionMutation.isPending ? 'Validating & Swapping...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
