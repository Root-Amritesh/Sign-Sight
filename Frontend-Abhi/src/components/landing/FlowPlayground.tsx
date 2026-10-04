import React, { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Sigil } from '../../icons';
import type { AttackFamily, Severity } from '../../types/api';

const SAMPLE_FLOWS = {
  dos: {
    duration: 0.12,
    protocol_type: 'tcp',
    service: 'http',
    flag: 'SF',
    src_bytes: 48200,
    dst_bytes: 0,
    count: 512,
    srv_count: 512,
    serror_rate: 0.98,
    srv_serror_rate: 0.98,
    same_srv_rate: 1.0,
    diff_srv_rate: 0.0,
  },
  r2l: {
    duration: 14.8,
    protocol_type: 'tcp',
    service: 'ftp',
    flag: 'SF',
    src_bytes: 284,
    dst_bytes: 4200,
    count: 2,
    srv_count: 1,
    serror_rate: 0.0,
    srv_serror_rate: 0.0,
    same_srv_rate: 0.5,
    diff_srv_rate: 0.5,
  },
  normal: {
    duration: 0.45,
    protocol_type: 'tcp',
    service: 'http',
    flag: 'SF',
    src_bytes: 1240,
    dst_bytes: 8400,
    count: 4,
    srv_count: 4,
    serror_rate: 0.0,
    srv_serror_rate: 0.0,
    same_srv_rate: 1.0,
    diff_srv_rate: 0.0,
  },
};

export const FlowPlayground: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>(JSON.stringify(SAMPLE_FLOWS.dos, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    status: string;
    anomaly_score: number;
    attack_family: AttackFamily;
    confidence: number;
    severity: Severity;
    isLive: boolean;
    flowId: string;
  } | null>(null);

  const { isAuthenticated } = useAuth();

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: unknown) {
      setJsonError((err as Error).message);
    }
  };

  const handleClassify = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setLoading(true);
      setJsonError(null);

      if (isAuthenticated) {
        try {
          const res = await api.ingestSingle(parsed);
          const fam = (res.prediction?.label || 'normal').toLowerCase() as AttackFamily;
          let sev: Severity = (res.alert?.severity?.toLowerCase() as Severity) || 'low';
          const conf = res.prediction?.confidence ?? 0;
          const anom = res.prediction?.anomaly_score ?? 0;
          if (!res.alert?.severity) {
            if (conf > 0.85 || anom > 0.8) sev = 'critical';
            else if (conf > 0.7) sev = 'high';
            else if (conf > 0.4) sev = 'medium';
          }

          setResult({
            status: 'success',
            anomaly_score: anom,
            attack_family: fam,
            confidence: conf,
            severity: sev,
            isLive: true,
            flowId: res.alert?.id || res.record_id || `flow-${Date.now().toString().slice(-4)}`,
          });
          setLoading(false);
          return;
        } catch (err: any) {
          // If server returns error, show it
          setJsonError(err?.detail || 'Inference error from backend.');
        }
      }

      // Client simulation when not signed in
      await new Promise((r) => setTimeout(r, 140));
      const serror = Number(parsed.serror_rate || 0);
      const isDos = serror > 0.5 || Number(parsed.count || 0) > 100;
      const isR2L = parsed.service === 'ftp' || parsed.service === 'telnet';

      const fam: AttackFamily = isDos ? 'dos' : isR2L ? 'r2l' : 'normal';
      const anomalyScore = isDos ? 0.942 : isR2L ? 0.785 : 0.124;
      const confidence = isDos ? 0.96 : isR2L ? 0.82 : 0.99;
      const severity: Severity = isDos ? 'critical' : isR2L ? 'high' : 'low';

      setResult({
        status: 'simulated',
        anomaly_score: anomalyScore,
        attack_family: fam,
        confidence,
        severity,
        isLive: false,
        flowId: `flow-${Date.now().toString().slice(-4)}`,
      });
    } catch {
      setJsonError('Invalid JSON format. Please verify syntax.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="playground"
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
          Live Evaluation Sandbox
        </div>
        <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
          Flow Ingestion Playground
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginTop: '6px' }}>
          Submit real NSL-KDD 41-feature flow vectors to test the two-stage inference pipeline directly from your browser.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* JSON Input Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label-caps">Network Flow Payload (JSON)</span>
            {/* Quick samples */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                onClick={() => handleJsonChange(JSON.stringify(SAMPLE_FLOWS.dos, null, 2))}
              >
                DoS Sample
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                onClick={() => handleJsonChange(JSON.stringify(SAMPLE_FLOWS.r2l, null, 2))}
              >
                R2L Sample
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: '22px', fontSize: '10px', padding: '0 6px' }}
                onClick={() => handleJsonChange(JSON.stringify(SAMPLE_FLOWS.normal, null, 2))}
              >
                Normal Sample
              </button>
            </div>
          </div>

          <textarea
            className="input font-mono"
            style={{
              height: '240px',
              fontSize: '12px',
              lineHeight: 1.4,
              resize: 'vertical',
              padding: '12px',
              backgroundColor: 'var(--bg-0)',
              borderColor: jsonError ? 'var(--sev-critical)' : 'var(--line)',
            }}
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            spellCheck={false}
          />

          {jsonError && (
            <div style={{ color: 'var(--sev-critical)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              Syntax error: {jsonError}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            style={{ height: '36px', width: '100%', fontSize: '13px' }}
            onClick={handleClassify}
            disabled={loading || Boolean(jsonError)}
          >
            {loading ? 'Evaluating Flow Vector...' : 'Classify Flow Vector'}
          </button>
        </div>

        {/* Evaluation Result Panel */}
        <div
          style={{
            backgroundColor: 'var(--bg-2)',
            border: '1px solid var(--line)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="label-caps">Inference Telemetry</span>
              {result && (
                <span className="sev-tag" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
                  {result.isLive ? 'LIVE INGEST (POST /api/ingest/single/)' : 'CLIENT EVALUATION'}
                </span>
              )}
            </div>

            {result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Sigil + Classification */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Sigil id={result.flowId} size={40} severity={result.severity} />
                  <div>
                    <div className="font-mono" style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 600 }}>
                      {result.attack_family.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Flow ID: {result.flowId}
                    </div>
                  </div>
                </div>

                {/* Score meters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span className="label-caps">Stage 1 Anomaly Score</span>
                      <span className="font-mono" style={{ color: 'var(--accent)' }}>
                        {result.anomaly_score.toFixed(3)}
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-0)', border: '1px solid var(--line)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${result.anomaly_score * 100}%`,
                          backgroundColor: result.anomaly_score > 0.5 ? 'var(--sev-critical)' : 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span className="label-caps">Stage 2 Predicted Confidence</span>
                      <span className="font-mono" style={{ color: 'var(--accent)' }}>
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-0)', border: '1px solid var(--line)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${result.confidence * 100}%`,
                          backgroundColor: 'var(--accent)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-0)',
                    border: '1px solid var(--line)',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ color: 'var(--text-dim)' }}>Assigned Severity Tier:</span>
                  <span className="font-mono" style={{ color: result.severity === 'critical' ? 'var(--sev-critical)' : 'var(--accent)', fontWeight: 600 }}>
                    {result.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                Load a flow sample and click &quot;Classify Flow Vector&quot; to observe pipeline output.
              </div>
            )}
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            Complies with NSL-KDD 41-feature schema evaluated by Isolation Forest and LightGBM models.
          </div>
        </div>
      </div>
    </section>
  );
};
