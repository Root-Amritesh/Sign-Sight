import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Sigil } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { WhyFlaggedPanel } from '../../components/alerts/WhyFlaggedPanel';
import { TeamsCardPreview } from '../../components/alerts/TeamsCardPreview';
import { useToast } from '../../components/common/Toast';
import { useTriageShortcuts } from '../../hooks/useTriageShortcuts';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Glyph } from '../../icons/glyphs';
import type { AlertStatus, AlertResolution } from '../../types/api';

export const AlertDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: alert, isLoading, isError, error } = useQuery({
    queryKey: ['alertDetail', id],
    queryFn: () => api.getAlertDetail(id || ''),
    enabled: !!id,
  });

  useDocumentTitle(alert ? `${alert.id.slice(0, 8)} (${alert.predictedLabel.toUpperCase()})` : 'Alert Detail');

  // Local form state for triage actions
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus>('new');
  const [resolution, setResolution] = useState<AlertResolution>(null);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (alert) {
      setSelectedStatus(alert.status || 'new');
      setResolution(alert.resolution ?? null);
      setNotes(alert.notes || '');

      // Auto-transition 'new' to 'viewed' if opening fresh alert
      if (alert.status === 'new') {
        api.updateAlert(alert.id, { status: 'viewed' }).then(() => {
          queryClient.invalidateQueries({ queryKey: ['alertsList'] });
          queryClient.invalidateQueries({ queryKey: ['alertStats'] });
        }).catch(() => {});
      }
    }
  }, [alert, queryClient]);

  // Patch mutation
  const updateMutation = useMutation({
    mutationFn: async (patch: { status?: AlertStatus; resolution?: AlertResolution; notes?: string }) => {
      if (!id) return;
      return api.updateAlert(id, {
        status: patch.status ?? selectedStatus,
        resolution: patch.resolution ?? resolution,
        notes: patch.notes ?? notes,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['alertDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['alertsList'] });
      queryClient.invalidateQueries({ queryKey: ['alertStats'] });
      if (updated) {
        setSelectedStatus(updated.status as AlertStatus);
        setResolution(updated.resolution as AlertResolution);
      }
      addToast('Alert decision updated and logged to audit trail.');
    },
    onError: (err: unknown) => {
      const errObj = err as { detail?: string };
      addToast(errObj.detail || 'Failed to update alert.', 'error');
    },
  });

  // Triage Shortcuts
  useTriageShortcuts({
    onEscalate: () => {
      if (alert && alert.status !== 'resolved') {
        setSelectedStatus('escalated');
        updateMutation.mutate({ status: 'escalated' });
      }
    },
    onResolve: () => {
      if (alert && alert.status !== 'resolved') {
        setSelectedStatus('resolved');
        setResolution('true_positive');
        updateMutation.mutate({ status: 'resolved', resolution: 'true_positive' });
      }
    },
    onCopyIp: () => {
      if (alert?.id) {
        navigator.clipboard.writeText(alert.id);
        addToast(`Copied Alert ID ${alert.id} to clipboard`);
      }
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="skeleton" style={{ height: '32px', width: '240px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div className="skeleton" style={{ height: '420px', width: '100%' }} />
          <div className="skeleton" style={{ height: '420px', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (isError || !alert) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div className="font-mono" style={{ color: 'var(--sev-critical)', fontSize: '16px', marginBottom: '8px' }}>
          Alert Record Not Found
        </div>
        <p style={{ color: 'var(--text-dim)', marginBottom: '16px', fontSize: '13px' }}>
          {(error as { detail?: string })?.detail || 'Alert record does not exist or backend is unreachable.'}
        </p>
        <Link to="/app/alerts" className="btn btn-secondary">
          &larr; Return to Alert Queue
        </Link>
      </div>
    );
  }

  const isResolved = alert.status === 'resolved';
  const traffic = alert.trafficRecord;

  // Allowed transitions
  // new -> viewed, escalated, resolved
  // viewed -> escalated, resolved
  // escalated -> resolved
  // resolved -> none (terminal)
  const canEscalate = alert.status === 'new' || alert.status === 'viewed';
  const canResolve = alert.status !== 'resolved';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Breadcrumb & Summary Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link
            to="/app/alerts"
            style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '6px', textDecoration: 'none' }}
          >
            &larr; Return to Alert Queue
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
              Forensic Investigation
            </h1>
            <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '14px' }}>
              {alert.id}
            </span>
            <SeverityTag severity={alert.severity} />
            <span className="badge-mono" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
              STATUS: {alert.status}
            </span>
            {alert.alertType && (
              <span className="badge-mono" style={{ color: 'var(--sev-high)', fontSize: '10px' }}>
                {alert.alertType.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="label-caps">INGESTED:</span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            {new Date(alert.createdAt).toISOString()}
          </span>
        </div>
      </div>

      {/* Two-Pane Forensic Composition */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(480px, 2fr) minmax(300px, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Pane: Forensic Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Explainability / Why Flagged Panel */}
          <WhyFlaggedPanel alert={alert} />

          {/* Teams Notification Preview if Escalated or Critical/High */}
          {(alert.status === 'escalated' || alert.severity === 'critical' || alert.severity === 'high') && (
            <TeamsCardPreview alert={alert} />
          )}

          {/* Network Context (NSL-KDD 41-feature flow summary) */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Network Flow Context (NSL-KDD)</span>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                PROTO: {traffic?.protocolType || 'N/A'} &bull; SVC: {traffic?.service || 'N/A'} &bull; FLAG: {traffic?.flag || 'N/A'}
              </span>
            </div>
            <div style={{ padding: '16px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '14px',
                }}
              >
                <div>
                  <div className="label-caps" style={{ marginBottom: '4px' }}>Flow Duration</div>
                  <div className="font-mono tabular-nums">{traffic?.duration ?? 0}s</div>
                </div>

                <div>
                  <div className="label-caps" style={{ marginBottom: '4px' }}>Source Bytes</div>
                  <div className="font-mono tabular-nums">{traffic?.srcBytes ?? 0} B</div>
                </div>

                <div>
                  <div className="label-caps" style={{ marginBottom: '4px' }}>Destination Bytes</div>
                  <div className="font-mono tabular-nums">{traffic?.dstBytes ?? 0} B</div>
                </div>

                <div>
                  <div className="label-caps" style={{ marginBottom: '4px' }}>Host Srv Count (2s)</div>
                  <div className="font-mono tabular-nums">{traffic?.srvCount ?? traffic?.count ?? 'N/A'}</div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div className="label-caps" style={{ marginBottom: '4px' }}>Network Addresses</div>
                  <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Source / Dest IPs & Ports: <span style={{ color: 'var(--text)' }}>N/A (NSL-KDD benchmark contains no IP headers)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MITRE ATT&CK Mapping */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">MITRE ATT&CK TTP Mapping</span>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                TACTIC: {alert.mitreTactic || 'TA0040'}
              </span>
            </div>
            <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  Technique: {alert.mitreTechnique || 'T1498'}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
                  Classified adversary pattern mapped to enterprise security matrix.
                </div>
              </div>

              {alert.isMitreUnverified ? (
                <span
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: 'var(--sev-high)',
                    border: '1px solid var(--sev-high)',
                    background: 'rgba(255, 154, 31, 0.1)',
                  }}
                >
                  UNVERIFIED TECHNIQUE
                </span>
              ) : (
                <span
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    background: 'rgba(182, 255, 59, 0.1)',
                  }}
                >
                  VERIFIED TTP
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Rail: Decision & Sigil Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sigil Display Card */}
          <div className="panel" style={{ padding: '24px', textAlign: 'center' }}>
            <div className="label-caps" style={{ marginBottom: '16px' }}>
              Deterministic Alert Sigil
            </div>
            <Sigil id={alert.id} size={96} severity={alert.severity} showHash={true} />
            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-dim)' }}>
              Deterministic mark derived from Alert UUID hash
            </div>
          </div>

          {/* Action Rail Form */}
          <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="label-caps" style={{ color: 'var(--text)', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
              Triage Verdict & Status
            </div>

            {/* Current Lifecycle Status */}
            <div>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                Status Transition:
              </label>
              {isResolved ? (
                <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                  This alert is <strong style={{ color: 'var(--accent)' }}>RESOLVED</strong> (Terminal State).
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {canEscalate && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => updateMutation.mutate({ status: 'escalated' })}
                      disabled={updateMutation.isPending}
                    >
                      <Glyph name="escalate" size={14} /> Escalate
                    </button>
                  )}
                  {canResolve && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => updateMutation.mutate({ status: 'resolved', resolution: 'true_positive' })}
                        disabled={updateMutation.isPending}
                      >
                        <Glyph name="true-positive" size={14} /> Resolve (True Positive)
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => updateMutation.mutate({ status: 'resolved', resolution: 'false_positive' })}
                        disabled={updateMutation.isPending}
                      >
                        <Glyph name="false-positive" size={14} /> Mark False Positive
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Resolution Verdict if Resolved */}
            {alert.resolution && (
              <div>
                <span className="label-caps">Resolution Verdict: </span>
                <span className="badge-mono" style={{ textTransform: 'uppercase', color: alert.resolution === 'true_positive' ? 'var(--sev-critical)' : 'var(--accent)' }}>
                  {alert.resolution.replace('_', ' ')}
                </span>
                {alert.resolvedBy && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Resolved by: {typeof alert.resolvedBy === 'object' ? alert.resolvedBy.username : alert.resolvedBy}
                  </div>
                )}
              </div>
            )}

            {/* Notes Textarea */}
            <div>
              <label className="label-caps" style={{ display: 'block', marginBottom: '6px' }}>
                Analyst Notes:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isResolved}
                rows={4}
                placeholder="Enter forensic observations, mitigation steps, or false-positive rationale..."
                style={{
                  width: '100%',
                  backgroundColor: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  color: 'var(--text)',
                  padding: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {!isResolved && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => updateMutation.mutate({ notes })}
                disabled={updateMutation.isPending}
                style={{ width: '100%' }}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
