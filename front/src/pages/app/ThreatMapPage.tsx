import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AttackMark, WarningIcon } from '../../icons';
import { ThreatGlobe3D } from './ThreatGlobe3D';
import { MapFlat, type GeoNode } from './MapFlat';
import type { AttackFamily } from '../../types/api';

export const ThreatMapPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'globe' | 'flat' | 'timeline'>('globe');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GeoNode | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(true);

  // Fetch real alerts
  const { data: response } = useQuery({
    queryKey: ['mapAlerts'],
    queryFn: () => api.getAlerts({ page: 1, page_size: 100, ordering: '-created_at' }),
    refetchInterval: 10000,
  });

  const alerts = useMemo(() => response?.results || [], [response]);

  // Filter alerts by severity
  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }
    return result;
  }, [alerts, severityFilter]);

  // Process geoNodes: only include if coordinates are genuinely returned by backend
  const geoNodes: GeoNode[] = useMemo(() => {
    const nodes: GeoNode[] = [];
    // NSL-KDD has no geographic coordinates or IPs; nodes will be 0 points
    filteredAlerts.forEach((alert) => {
      const rawWithGeo = alert as unknown as { latitude?: number; longitude?: number };
      if (rawWithGeo.latitude !== undefined && rawWithGeo.longitude !== undefined) {
        nodes.push({
          ip: alert.id,
          count: 1,
          maxSeverity: alert.severity,
          coordinates: [rawWithGeo.longitude, rawWithGeo.latitude],
          alerts: [alert as any],
          isSimulated: false,
        });
      }
    });
    return nodes;
  }, [filteredAlerts]);

  // Attack Family Volume Breakdown over Time (Supported View)
  const familyCounts = useMemo(() => {
    const counts: Record<AttackFamily, number> = {
      normal: 0,
      dos: 0,
      probe: 0,
      r2l: 0,
      u2r: 0,
    };
    alerts.forEach((a) => {
      if (a.predictedLabel in counts) {
        counts[a.predictedLabel]++;
      }
    });
    return counts;
  }, [alerts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
            Threat Telemetry & Geographic Overlay
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            Topological map projection &bull; Attack class distribution &bull; Zero fabricated coordinates
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveTab('globe')}
            style={{
              height: '28px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeTab === 'globe' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'globe' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            3D Globe
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveTab('flat')}
            style={{
              height: '28px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeTab === 'flat' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'flat' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            2D Projection
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveTab('timeline')}
            style={{
              height: '28px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeTab === 'timeline' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'timeline' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Attack Distribution Chart
          </button>
        </div>
      </div>

      {/* Main Map / Visualizer Canvas */}
      <div
        className="panel"
        style={{
          position: 'relative',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-0)',
          overflow: 'hidden',
        }}
      >
        {/* Informational overlay regarding NSL-KDD dataset absence of geo headers */}
        {(activeTab === 'globe' || activeTab === 'flat') && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              zIndex: 10,
              backgroundColor: 'rgba(16, 18, 20, 0.92)',
              border: '1px solid var(--line-strong)',
              padding: '10px 14px',
              maxWidth: '380px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <WarningIcon size={14} />
              <span className="label-caps" style={{ color: 'var(--text)' }}>
                Dataset Context
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', lineHeight: 1.4 }}>
              No geographic data: the backend does not return source locations for this dataset (NSL-KDD contains no IP or coordinate headers).
            </div>
          </div>
        )}

        {/* Severity Filter on Map */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(16, 18, 20, 0.9)',
            border: '1px solid var(--line)',
            padding: '6px 10px',
          }}
        >
          <span className="label-caps">Filter:</span>
          <select
            className="select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{ height: '28px', fontSize: '11px' }}
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="critical">CRITICAL</option>
            <option value="high">HIGH</option>
            <option value="medium">MEDIUM</option>
            <option value="low">LOW</option>
          </select>
        </div>

        {/* 3D Globe Render */}
        {activeTab === 'globe' && (
          <div style={{ width: '100%', height: '480px', position: 'relative' }}>
            <ThreatGlobe3D
              geoNodes={geoNodes}
              filteredAlerts={filteredAlerts as any}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              selectedCountry={selectedCountry}
              onSelectCountry={setSelectedCountry}
              isRotating={isRotating}
              onToggleRotating={() => setIsRotating(!isRotating)}
            />
          </div>
        )}

        {/* 2D Flat Map Render */}
        {activeTab === 'flat' && (
          <div style={{ width: '100%', padding: '20px' }}>
            <MapFlat
              geoNodes={geoNodes}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              hoveredCountry={selectedCountry}
              onHoverCountry={setSelectedCountry}
              onSelectCountry={setSelectedCountry}
            />
          </div>
        )}

        {/* Supported Second View: Attack Family Breakdown Chart */}
        {activeTab === 'timeline' && (
          <div style={{ width: '100%', padding: '32px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', fontWeight: 600 }}>
              Live Alert Volume by Attack Category (NSL-KDD)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(['dos', 'probe', 'r2l', 'u2r', 'normal'] as const).map((fam) => {
                const count = familyCounts[fam] || 0;
                const total = alerts.length || 1;
                const pct = (count / total) * 100;

                return (
                  <div key={fam} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AttackMark family={fam} size={14} />
                        <span className="label-caps">{fam.toUpperCase()}</span>
                      </div>
                      <span className="font-mono">
                        {count} alerts ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '10px',
                        backgroundColor: 'var(--bg-2)',
                        border: '1px solid var(--line)',
                        width: '100%',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor:
                            fam === 'dos'
                              ? 'var(--sev-critical)'
                              : fam === 'probe'
                              ? 'var(--sev-high)'
                              : fam === 'r2l'
                              ? 'var(--sev-medium)'
                              : fam === 'u2r'
                              ? 'var(--sev-critical)'
                              : 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
