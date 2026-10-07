import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { groupAlertsIntoIncidents, type Incident } from '../../utils/incidentGrouper';
import { ExportIcon, CheckIcon, Sigil, AttackMark } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { exportIncidentToMarkdown, downloadFile } from '../../utils/reportExporter';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [notes, setNotes] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const passedIncident = (location.state as { incident?: Incident })?.incident;

  const { data: response } = useQuery({
    queryKey: ['alertsForIncidents'],
    queryFn: () => api.getAlerts({ page_size: 100 }),
    enabled: !passedIncident,
  });

  const incident: Incident | undefined =
    passedIncident ||
    (response ? groupAlertsIntoIncidents(response.results).find((i) => i.id === id) : undefined);

  if (!incident) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div className="font-mono" style={{ color: 'var(--sev-critical)', fontSize: '18px', marginBottom: '8px' }}>
          Incident Record Not Found
        </div>
        <Link to="/app/incidents" className="btn btn-secondary">
          &larr; Return to Incidents List
        </Link>
      </div>
    );
  }

  const handleExport = () => {
    const md = exportIncidentToMarkdown(incident);
    downloadFile(md, `${incident.id}-incident-report.md`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Breadcrumb Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link
            to="/app/incidents"
            style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}
          >
            &larr; Return to Incidents
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="font-display" style={{ fontSize: '24px', color: 'var(--text)', margin: 0 }}>
              Correlated Incident Analysis
            </h1>
            <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '16px' }}>
              {incident.id}
            </span>
            <SeverityTag severity={incident.severity} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="btn btn-secondary"
          style={{ height: '32px', fontSize: '12px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {copied ? <CheckIcon size={14} /> : <ExportIcon size={14} />}
          <span>Export Incident Report (MD)</span>
        </button>
      </div>

      {/* Incident Metadata Grid */}
      <div
        style={{
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line)',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div className="label-caps">Attack Family</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <AttackMark family={incident.attack_family} size={16} />
            <span className="font-mono label-caps" style={{ fontSize: '14px', color: 'var(--text)' }}>
              {incident.attack_family}
            </span>
          </div>
        </div>

        <div>
          <div className="label-caps">Clustered Alerts</div>
          <div className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)', marginTop: '6px' }}>
            {incident.alert_count} flows
          </div>
        </div>

        <div>
          <div className="label-caps">Aggregation Window</div>
          <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
            {new Date(incident.first_seen).toLocaleTimeString()} - {new Date(incident.last_seen).toLocaleTimeString()}
          </div>
        </div>

        <div>
          <div className="label-caps">Incident Status</div>
          <div className="font-mono label-caps" style={{ fontSize: '12px', color: 'var(--text)', marginTop: '6px' }}>
            {incident.status}
          </div>
        </div>
      </div>

      {/* Clustered Alerts Chronology */}
      <div className="panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="label-caps" style={{ color: 'var(--accent)' }}>
            Clustered Telemetry Flows Chronology
          </span>
          <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Grouped in browser by attack class and time (15-min window)
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {incident.alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 80px 24px 1fr 100px 100px 80px',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                borderLeft: `3px solid ${
                  alert.severity === 'critical' ? 'var(--sev-critical)' : 'var(--accent)'
                }`,
              }}
            >
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>

              <SeverityTag severity={alert.severity} />

              <Sigil id={alert.id} size={18} severity={alert.severity} />

              <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text)' }}>
                {alert.id}
              </span>

              <span className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Conf: {(alert.confidence * 100).toFixed(1)}%
              </span>

              <span className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Anom: {(alert.anomalyScore ?? 0).toFixed(3)}
              </span>

              <div style={{ textAlign: 'right' }}>
                <Link
                  to={`/app/alerts/${alert.id}`}
                  style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'underline' }}
                >
                  Inspect &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analyst Verdict & Investigation Findings */}
      <div className="panel" style={{ padding: '20px' }}>
        <div className="label-caps" style={{ marginBottom: '12px' }}>
          Analyst Incident Findings &amp; Response Record
        </div>
        <textarea
          className="input font-mono"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record overall incident investigation summary, containment action, SOC ticket ID..."
          style={{ width: '100%', height: '100px', resize: 'vertical', padding: '10px' }}
        />
      </div>
    </div>
  );
};
