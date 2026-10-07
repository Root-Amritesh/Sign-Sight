import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { AttackMark } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { useToast } from '../../components/common/Toast';
import type { IngestSingleResponse } from '../../types/api';

const DOCUMENTED_EXAMPLE_RECORD = {
  duration: 0,
  protocol_type: 'tcp',
  service: 'http',
  flag: 'SF',
  src_bytes: 181,
  dst_bytes: 5450,
  land: 0,
  wrong_fragment: 0,
  urgent: 0,
  hot: 0,
  num_failed_logins: 0,
  logged_in: 1,
  num_compromised: 0,
  root_shell: 0,
  su_attempted: 0,
  num_root: 0,
  num_file_creations: 0,
  num_shells: 0,
  num_access_files: 0,
  num_outbound_cmds: 0,
  is_host_login: 0,
  is_guest_login: 0,
  count: 8,
  srv_count: 8,
  serror_rate: 0.0,
  srv_serror_rate: 0.0,
  rerror_rate: 0.0,
  srv_rerror_rate: 0.0,
  same_srv_rate: 1.0,
  diff_srv_rate: 0.0,
  srv_diff_host_rate: 0.0,
  dst_host_count: 9,
  dst_host_srv_count: 9,
  dst_host_same_srv_rate: 1.0,
  dst_host_diff_srv_rate: 0.0,
  dst_host_same_src_port_rate: 0.11,
  dst_host_srv_diff_host_rate: 0.0,
  dst_host_serror_rate: 0.0,
  dst_host_srv_serror_rate: 0.0,
  dst_host_rerror_rate: 0.0,
  dst_host_srv_rerror_rate: 0.0,
};

interface LocalBatchTask {
  id: string;
  status: string;
  progressPercent: number;
  totalRecords: number;
  processedRecords: number;
  createdAt: string;
}

export const IngestPage: React.FC = () => {
  const { role } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'replay'>('single');

  // Tab 1: Single flow state (Blank by default)
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [jsonMode, setJsonMode] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<{
    detail: string;
    errors?: Record<string, string[]>;
    code?: string;
    retryAfter?: number;
  } | null>(null);
  const [singleResult, setSingleResult] = useState<IngestSingleResponse | null>(null);

  // Tab 2: Batch CSV state (Admin only)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchTask, setBatchTask] = useState<LocalBatchTask | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Tab 3: Replay state (Admin only)
  const [replayDatasetPath, setReplayDatasetPath] = useState('data/nsl_kdd/KDDTest+.csv');
  const [recordsPerSec, setRecordsPerSec] = useState<number>(10);
  const [maxRecords, setMaxRecords] = useState<number>(1000);
  const [replayActive, setReplayActive] = useState<boolean>(false);
  const [replayTaskId, setReplayTaskId] = useState<string | null>(null);
  const [replayLoading, setReplayLoading] = useState<boolean>(false);

  // Fill documented example
  const handleInsertExample = () => {
    setFormData(DOCUMENTED_EXAMPLE_RECORD);
    setJsonInput(JSON.stringify(DOCUMENTED_EXAMPLE_RECORD, null, 2));
    setSingleError(null);
    addToast('Documented NSL-KDD example record inserted.');
  };

  const handleClearForm = () => {
    setFormData({});
    setJsonInput('');
    setSingleError(null);
    setSingleResult(null);
  };

  // Submit single flow
  const handleSingleSubmit = async () => {
    setSingleError(null);
    setSingleResult(null);

    let payload: Record<string, unknown>;
    if (jsonMode) {
      try {
        payload = JSON.parse(jsonInput);
      } catch {
        setSingleError({ detail: 'Invalid JSON syntax. Correct JSON before submitting.' });
        return;
      }
    } else {
      payload = formData;
    }

    if (Object.keys(payload).length === 0) {
      setSingleError({ detail: 'Record cannot be empty. Fill the 41 fields or click "Insert example record".' });
      return;
    }

    setSingleLoading(true);
    try {
      const res = await api.ingestSingle(payload);
      setSingleResult(res);
      addToast('Traffic record processed through inference pipeline.');
    } catch (err: unknown) {
      const errObj = err as { detail?: string; code?: string; errors?: Record<string, string[]>; retryAfter?: number };
      setSingleError({
        detail: errObj.detail || 'Ingestion failed.',
        code: errObj.code,
        errors: errObj.errors,
        retryAfter: errObj.retryAfter,
      });
    } finally {
      setSingleLoading(false);
    }
  };

  // Handle Batch CSV Upload
  const handleBatchUpload = async () => {
    if (!selectedFile) {
      setBatchError('Please choose a CSV file first.');
      return;
    }
    setBatchUploading(true);
    setBatchError(null);

    try {
      const res = await api.ingestBatch(selectedFile);
      setBatchTask({
        id: res.task_id,
        status: res.status || 'processing',
        progressPercent: 0,
        totalRecords: 0,
        processedRecords: 0,
        createdAt: new Date().toISOString(),
      });
      addToast('Batch ingestion task queued.');

      // Poll task progress
      const interval = setInterval(async () => {
        try {
          const statusRes = await api.getIngestTaskStatus(res.task_id);
          setBatchTask({
            id: statusRes.task_id,
            status: statusRes.status || 'processing',
            progressPercent: statusRes.progress?.percent_complete ?? 0,
            totalRecords: statusRes.progress?.total_records ?? 0,
            processedRecords: statusRes.progress?.processed ?? 0,
            createdAt: statusRes.started_at || new Date().toISOString(),
          });
          if (statusRes.status === 'completed' || statusRes.status === 'failed') {
            clearInterval(interval);
          }
        } catch {
          clearInterval(interval);
        }
      }, 2000);
    } catch (err: unknown) {
      const errObj = err as { detail?: string };
      setBatchError(errObj.detail || 'Batch CSV upload failed.');
    } finally {
      setBatchUploading(false);
    }
  };

  // Start / Stop Replay
  const handleToggleReplay = async () => {
    setReplayLoading(true);
    try {
      if (replayActive) {
        await api.stopReplay();
        setReplayActive(false);
        setReplayTaskId(null);
        addToast('Live dataset replay stopped.');
      } else {
        const res = await api.startReplay({
          dataset_path: replayDatasetPath,
          records_per_second: recordsPerSec,
          max_records: maxRecords,
        });
        setReplayActive(true);
        setReplayTaskId(res.task_id);
        addToast('Live dataset replay started.');
      }
    } catch (err: unknown) {
      const errObj = err as { detail?: string };
      addToast(errObj.detail || 'Replay command failed.', 'error');
    } finally {
      setReplayLoading(false);
    }
  };

  const isAdmin = role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: '20px', margin: 0 }}>
            Traffic Ingestion & Replay Console
          </h1>
          <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
            NSL-KDD 41-feature single record ingestion &bull; Batch CSV processing &bull; Real-time dataset replay
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--line)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveTab('single')}
            style={{
              height: '28px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeTab === 'single' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'single' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Single Flow (41 Fields)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveTab('batch')}
            style={{
              height: '28px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeTab === 'batch' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'batch' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Batch CSV {!isAdmin && '(Admin)'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveTab('replay')}
            style={{
              height: '28px',
              padding: '0 12px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: activeTab === 'replay' ? 'var(--bg-2)' : 'transparent',
              color: activeTab === 'replay' ? 'var(--accent)' : 'var(--text-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Dataset Replay {!isAdmin && '(Admin)'}
          </button>
        </div>
      </div>

      {/* Tab 1: Single Flow Ingestion */}
      {activeTab === 'single' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 2fr) minmax(300px, 1.2fr)', gap: '20px' }}>
          {/* Form Side */}
          <div className="panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="label-caps">Input Mode:</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setJsonMode(!jsonMode)}
                  style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                >
                  {jsonMode ? 'Switch to Form View' : 'Switch to JSON Raw Paste'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleInsertExample}
                  style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                >
                  Insert Example Record
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearForm}
                  style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Error Display */}
            {singleError && (
              <div
                style={{
                  background: 'rgba(255, 77, 61, 0.08)',
                  border: '1px solid var(--sev-critical)',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '12px',
                }}
              >
                <div style={{ color: 'var(--sev-critical)', fontWeight: 600 }}>{singleError.detail}</div>
                {singleError.code && <div style={{ color: 'var(--text-dim)', marginTop: '2px' }}>Code: {singleError.code}</div>}
                {singleError.retryAfter && (
                  <div style={{ color: 'var(--sev-high)', marginTop: '2px' }}>
                    Model unavailable. Retry after: {singleError.retryAfter}s
                  </div>
                )}
                {singleError.errors && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {Object.entries(singleError.errors).map(([f, msgs]) => (
                      <div key={f} style={{ color: 'var(--sev-high)' }}>
                        &bull; <code>{f}</code>: {msgs.join(', ')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* JSON Mode or Form Mode */}
            {jsonMode ? (
              <div>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  rows={20}
                  placeholder={`Paste 41-feature NSL-KDD JSON payload here...\n{\n  "duration": 0,\n  "protocol_type": "tcp",\n  "service": "http",\n  ...\n}`}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-2)',
                    border: '1px solid var(--line)',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    padding: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Group 1: Basic TCP Connection (9 fields) */}
                <div>
                  <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
                    1. Basic TCP Connection Features (9)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>duration</label>
                      <input
                        type="number"
                        className="input-custom"
                        value={String(formData.duration ?? '')}
                        onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>protocol_type</label>
                      <select
                        className="select-custom"
                        value={String(formData.protocol_type ?? 'tcp')}
                        onChange={(e) => setFormData({ ...formData, protocol_type: e.target.value })}
                      >
                        <option value="tcp">tcp</option>
                        <option value="udp">udp</option>
                        <option value="icmp">icmp</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>service</label>
                      <input
                        type="text"
                        className="input-custom"
                        value={String(formData.service ?? '')}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        placeholder="http"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>flag</label>
                      <input
                        type="text"
                        className="input-custom"
                        value={String(formData.flag ?? '')}
                        onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                        placeholder="SF"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>src_bytes</label>
                      <input
                        type="number"
                        className="input-custom"
                        value={String(formData.src_bytes ?? '')}
                        onChange={(e) => setFormData({ ...formData, src_bytes: Number(e.target.value) })}
                        placeholder="181"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>dst_bytes</label>
                      <input
                        type="number"
                        className="input-custom"
                        value={String(formData.dst_bytes ?? '')}
                        onChange={(e) => setFormData({ ...formData, dst_bytes: Number(e.target.value) })}
                        placeholder="5450"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>land (0/1)</label>
                      <input
                        type="number"
                        className="input-custom"
                        value={String(formData.land ?? '')}
                        onChange={(e) => setFormData({ ...formData, land: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>wrong_fragment</label>
                      <input
                        type="number"
                        className="input-custom"
                        value={String(formData.wrong_fragment ?? '')}
                        onChange={(e) => setFormData({ ...formData, wrong_fragment: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="label-caps" style={{ fontSize: '10px' }}>urgent</label>
                      <input
                        type="number"
                        className="input-custom"
                        value={String(formData.urgent ?? '')}
                        onChange={(e) => setFormData({ ...formData, urgent: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Group 2: Content-Based Features (13 fields) */}
                <div>
                  <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
                    2. Content Features (13)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {['hot', 'num_failed_logins', 'logged_in', 'num_compromised', 'root_shell', 'su_attempted', 'num_root', 'num_file_creations', 'num_shells', 'num_access_files', 'num_outbound_cmds', 'is_host_login', 'is_guest_login'].map((field) => (
                      <div key={field}>
                        <label className="label-caps" style={{ fontSize: '10px' }}>{field}</label>
                        <input
                          type="number"
                          className="input-custom"
                          value={String(formData[field] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [field]: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group 3: Traffic & Host Features (19 fields) */}
                <div>
                  <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>
                    3. Traffic & Host Features (19)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {['count', 'srv_count', 'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate', 'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate', 'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate', 'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate', 'dst_host_srv_diff_host_rate', 'dst_host_serror_rate', 'dst_host_srv_serror_rate', 'dst_host_rerror_rate', 'dst_host_srv_rerror_rate'].map((field) => (
                      <div key={field}>
                        <label className="label-caps" style={{ fontSize: '10px' }}>{field}</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input-custom"
                          value={String(formData[field] ?? '')}
                          onChange={(e) => setFormData({ ...formData, [field]: Number(e.target.value) })}
                          placeholder="0.0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSingleSubmit}
              disabled={singleLoading}
              style={{ width: '100%', marginTop: '20px', height: '36px', fontSize: '13px' }}
            >
              {singleLoading ? 'Evaluating Flow in Pipeline...' : 'Submit Flow for Evaluation'}
            </button>
          </div>

          {/* Results Side */}
          <div className="panel" style={{ padding: '20px' }}>
            <div className="label-caps" style={{ marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
              Inference Evaluation Result
            </div>

            {singleResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Record ID:</span>
                  <code style={{ fontSize: '11px' }}>{singleResult.record_id}</code>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Predicted Class:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AttackMark family={singleResult.prediction.label} size={16} />
                    <span className="label-caps" style={{ fontWeight: 600 }}>{singleResult.prediction.label}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Confidence:</span>
                  <span className="font-mono">{(singleResult.prediction.confidence * 100).toFixed(1)}%</span>
                </div>

                {singleResult.prediction.anomaly_score !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Stage 1 Anomaly Score:</span>
                    <span className="font-mono">{singleResult.prediction.anomaly_score.toFixed(3)}</span>
                  </div>
                )}

                {/* Alert Created Banner */}
                {singleResult.alert ? (
                  <div
                    style={{
                      background: 'rgba(255, 77, 61, 0.08)',
                      border: '1px solid var(--sev-critical)',
                      padding: '12px',
                      marginTop: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="label-caps" style={{ color: 'var(--sev-critical)' }}>
                        🚨 Threat Alert Created
                      </span>
                      <SeverityTag severity={singleResult.alert.severity} />
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                      Alert ID: <code>{singleResult.alert.id}</code>
                    </div>
                    <Link
                      to={`/app/alerts/${singleResult.alert.id}`}
                      className="btn btn-primary"
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '6px' }}
                    >
                      Open Forensic Investigation &rarr;
                    </Link>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(182, 255, 59, 0.08)',
                      border: '1px solid var(--accent)',
                      padding: '12px',
                      marginTop: '10px',
                      color: 'var(--accent)',
                    }}
                  >
                    &bull; Flow classified as Normal. No SOC alert required.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                Submit a flow record on the left to see live Stage 1 anomaly scores and Stage 2 multi-class classifications.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Batch CSV Ingestion (Admin) */}
      {activeTab === 'batch' && (
        <div className="panel" style={{ padding: '24px', maxWidth: '640px' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', fontWeight: 600 }}>Batch CSV File Ingestion (Admin)</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '0 0 16px 0' }}>
            Upload standard NSL-KDD CSV test sets (e.g. KDDTest+.csv). Processing runs asynchronously via Celery workers.
          </p>

          {!isAdmin ? (
            <div style={{ padding: '20px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--sev-high)', fontSize: '13px' }}>
              Admin role required. Sign in as an administrator to run batch CSV ingestion tasks.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{
                  backgroundColor: 'var(--bg-2)',
                  border: '1px solid var(--line)',
                  padding: '12px',
                  color: 'var(--text)',
                }}
              />

              {batchError && <div style={{ color: 'var(--sev-critical)', fontSize: '12px' }}>{batchError}</div>}

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBatchUpload}
                disabled={!selectedFile || batchUploading}
                style={{ height: '36px' }}
              >
                {batchUploading ? 'Uploading CSV...' : 'Upload & Start Processing'}
              </button>

              {batchTask && (
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', padding: '16px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="label-caps">Task Progress:</span>
                    <span className="badge-mono" style={{ textTransform: 'uppercase' }}>{batchTask.status}</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--bg-1)', border: '1px solid var(--line)', width: '100%', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${batchTask.progressPercent}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Processed: {batchTask.processedRecords} of {batchTask.totalRecords} records ({batchTask.progressPercent}%)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Dataset Replay (Admin) */}
      {activeTab === 'replay' && (
        <div className="panel" style={{ padding: '24px', maxWidth: '640px' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', fontWeight: 600 }}>Simulated Live Feed Replay (Admin)</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '0 0 16px 0' }}>
            Continuously stream dataset records into the pipeline at a controlled rate to simulate live enterprise network traffic.
          </p>

          {!isAdmin ? (
            <div style={{ padding: '20px', background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--sev-high)', fontSize: '13px' }}>
              Admin role required. Sign in as an administrator to launch traffic replay sessions.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label-caps" style={{ display: 'block', marginBottom: '4px' }}>Server Dataset File Path:</label>
                <input
                  type="text"
                  className="input-custom"
                  value={replayDatasetPath}
                  onChange={(e) => setReplayDatasetPath(e.target.value)}
                  placeholder="data/nsl_kdd/KDDTest+.csv"
                  disabled={replayActive}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '4px' }}>Records / Second:</label>
                  <input
                    type="number"
                    className="input-custom"
                    value={recordsPerSec}
                    onChange={(e) => setRecordsPerSec(Number(e.target.value))}
                    disabled={replayActive}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="label-caps" style={{ display: 'block', marginBottom: '4px' }}>Max Records:</label>
                  <input
                    type="number"
                    className="input-custom"
                    value={maxRecords}
                    onChange={(e) => setMaxRecords(Number(e.target.value))}
                    disabled={replayActive}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <button
                type="button"
                className={`btn ${replayActive ? 'btn-secondary' : 'btn-primary'}`}
                onClick={handleToggleReplay}
                disabled={replayLoading}
                style={{ height: '36px' }}
              >
                {replayLoading ? 'Executing...' : replayActive ? 'Stop Active Replay' : 'Start Live Replay'}
              </button>

              {replayTaskId && (
                <div style={{ fontSize: '12px', color: 'var(--accent)' }}>
                  Active Replay Task ID: <code>{replayTaskId}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
