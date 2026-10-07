import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CopyIcon, CheckIcon } from '../../icons';

interface DocSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export const DocsPage: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<string>('getting-started');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copySnippet = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const SECTIONS: DocSection[] = [
    {
      id: 'getting-started',
      title: '1. Getting Started',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>
            SignSight is a specialized hybrid machine learning Network Intrusion Detection System (NIDS) tailored for SOC operations. It accepts NetFlow v9 and IPFIX flow records, evaluates each vector through a dual-stage pipeline (Isolation Forest followed by LightGBM), and routes anomalous events into a triaged analyst queue.
          </p>
          <div className="panel" style={{ padding: '16px', backgroundColor: 'var(--bg-1)' }}>
            <div className="label-caps" style={{ marginBottom: '8px' }}>Standard SOC Workflow</div>
            <ol style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.6 }}>
              <li>Authenticate to the console via <code>/auth</code> with Analyst or Admin role credentials.</li>
              <li>Monitor the real-time Ingress Feed on the Dashboard (<code>/app/dashboard</code>).</li>
              <li>Triage high-confidence and novel suspicious incidents in the Alert Queue (<code>/app/alerts</code>).</li>
              <li>Inspect feature importances and anomaly gauges on Alert Detail (<code>/app/alerts/:id</code>).</li>
              <li>Record analyst verdicts (True Positive, False Positive, Escalated) to inform future retraining candidate datasets.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'alert-lifecycle',
      title: '2. Alert Lifecycle & Triage',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>
            Alerts transition through explicit operational states to prevent duplicate analyst effort and provide complete forensic accountability.
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Definition</th>
                  <th>Next Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="font-mono" style={{ color: 'var(--accent)' }}>NEW</span></td>
                  <td>Freshly ingested anomaly awaiting analyst review.</td>
                  <td>Claim for investigation; assign to tier 1 analyst.</td>
                </tr>
                <tr>
                  <td><span className="font-mono" style={{ color: 'var(--sev-medium)' }}>INVESTIGATING</span></td>
                  <td>Active forensic inspection by assigned analyst.</td>
                  <td>Analyze feature weights, verify PCAP context.</td>
                </tr>
                <tr>
                  <td><span className="font-mono" style={{ color: 'var(--text-dim)' }}>RESOLVED</span></td>
                  <td>Triage complete; verdict committed to audit log.</td>
                  <td>Archive record; export forensic incident report.</td>
                </tr>
                <tr>
                  <td><span className="font-mono" style={{ color: 'var(--text-faint)' }}>DISMISSED</span></td>
                  <td>Validated as benign administrative maintenance.</td>
                  <td>Tag as false positive for candidate training log.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'query-syntax',
      title: '3. Query Syntax & Filtering',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>
            The Query Workspace (<code>/app/query</code>) supports raw search tokenization over 5-tuple flow headers and ML inference metrics.
          </p>
          <div style={{ position: 'relative' }}>
            <pre
              className="font-mono"
              style={{
                backgroundColor: 'var(--bg-0)',
                border: '1px solid var(--line-strong)',
                padding: '16px',
                fontSize: '12px',
                color: 'var(--text)',
                overflowX: 'auto',
              }}
            >
              <code>src_ip:198.51.100.44 severity:critical family:dos anomaly:&gt;0.80</code>
            </pre>
            <button
              type="button"
              onClick={() => copySnippet('src_ip:198.51.100.44 severity:critical family:dos anomaly:>0.80', 'code-query-1')}
              className="btn btn-secondary"
              style={{ position: 'absolute', top: '8px', right: '8px', height: '24px', fontSize: '11px', padding: '0 6px' }}
            >
              {copiedCode === 'code-query-1' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Field Keyword</th>
                  <th>Accepted Operators</th>
                  <th>Example Query</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono">src_ip / dst_ip</td>
                  <td><code>:</code> (exact / prefix)</td>
                  <td className="font-mono">src_ip:10.0.0.5</td>
                </tr>
                <tr>
                  <td className="font-mono">severity</td>
                  <td><code>:</code> (critical, high, medium, low)</td>
                  <td className="font-mono">severity:critical</td>
                </tr>
                <tr>
                  <td className="font-mono">family</td>
                  <td><code>:</code> (dos, probe, r2l, u2r, normal)</td>
                  <td className="font-mono">family:r2l</td>
                </tr>
                <tr>
                  <td className="font-mono">anomaly</td>
                  <td><code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code></td>
                  <td className="font-mono">anomaly:&gt;0.75</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 'model-registry',
      title: '4. Model Registry & Deployments',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>
            Admin users manage active model bundles in <code>/app/registry</code>. Every deployment and rollback requires explicit version string confirmation and emits an entry to the immutable audit trail.
          </p>
          <div style={{ position: 'relative' }}>
            <pre
              className="font-mono"
              style={{
                backgroundColor: 'var(--bg-0)',
                border: '1px solid var(--line-strong)',
                padding: '16px',
                fontSize: '12px',
                color: 'var(--accent)',
                overflowX: 'auto',
              }}
            >
              <code>curl -X POST http://localhost:8000/api/models/deploy/ \<br />  -H &quot;Authorization: Bearer &lt;JWT&gt;&quot; \<br />  -H &quot;Content-Type: application/json&quot; \<br />  -d &apos;&#123; &quot;version&quot;: &quot;if-lgbm-v2.4.1&quot; &#125;&apos;</code>
            </pre>
            <button
              type="button"
              onClick={() => copySnippet('curl -X POST http://localhost:8000/api/models/deploy/ -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d \'{"version": "if-lgbm-v2.4.1"}\'', 'code-deploy')}
              className="btn btn-secondary"
              style={{ position: 'absolute', top: '8px', right: '8px', height: '24px', fontSize: '11px', padding: '0 6px' }}
            >
              {copiedCode === 'code-deploy' ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'keyboard-shortcuts',
      title: '5. Keyboard Shortcuts Reference',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p>
            SignSight is built for high-throughput keyboard operations in the SOC. Shortcuts are globally accessible and automatically inhibited when focus is within an input or textarea.
          </p>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Key Combo</th>
                  <th>Context</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><kbd className="font-mono" style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line-strong)' }}>J / K</kbd></td>
                  <td>Alert Queue / Incident List</td>
                  <td>Navigate next / previous row</td>
                </tr>
                <tr>
                  <td><kbd className="font-mono" style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line-strong)' }}>Enter</kbd></td>
                  <td>Alert Queue</td>
                  <td>Open selected alert detail</td>
                </tr>
                <tr>
                  <td><kbd className="font-mono" style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line-strong)' }}>E</kbd></td>
                  <td>Alert Detail</td>
                  <td>Escalate to Tier 2 SOC</td>
                </tr>
                <tr>
                  <td><kbd className="font-mono" style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line-strong)' }}>T / F</kbd></td>
                  <td>Alert Detail</td>
                  <td>Mark True Positive / False Positive</td>
                </tr>
                <tr>
                  <td><kbd className="font-mono" style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line-strong)' }}>Ctrl / Cmd + K</kbd></td>
                  <td>Global</td>
                  <td>Open Command Palette</td>
                </tr>
                <tr>
                  <td><kbd className="font-mono" style={{ padding: '2px 6px', backgroundColor: 'var(--bg-2)', border: '1px solid var(--line-strong)' }}>?</kbd></td>
                  <td>Global</td>
                  <td>Open Shortcuts Cheat Sheet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
  ];

  const currentDoc = SECTIONS.find((s) => s.id === activeSectionId) || SECTIONS[0];

  return (
    <div style={{ backgroundColor: 'var(--bg-0)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
            <span className="font-display" style={{ fontSize: '16px', color: 'var(--text)' }}>
              SignSight Docs
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            v2.4 TECHNICAL MANUAL
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/api" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>API Explorer</Link>
          <Link to="/glossary" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Glossary</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Docs Body Layout: Sticky Sidebar + 68ch Content Area */}
      <div
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '32px 24px',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 260px) 1fr',
          gap: '40px',
        }}
      >
        {/* Sticky Left TOC Nav */}
        <aside
          style={{
            position: 'sticky',
            top: '80px',
            height: 'fit-content',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div className="label-caps" style={{ marginBottom: '8px' }}>
            Documentation Index
          </div>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSectionId(sec.id)}
              style={{
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: '13px',
                backgroundColor: activeSectionId === sec.id ? 'var(--bg-2)' : 'transparent',
                color: activeSectionId === sec.id ? 'var(--accent)' : 'var(--text-dim)',
                border: 'none',
                borderLeft: activeSectionId === sec.id ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {sec.title}
            </button>
          ))}
        </aside>

        {/* 68ch Reading Container */}
        <main style={{ maxWidth: '68ch', width: '100%' }}>
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Technical Specification
          </div>
          <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '24px', letterSpacing: '-0.02em' }}>
            {currentDoc.title}
          </h1>
          <div style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 1.6 }}>
            {currentDoc.content}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Documentation &bull; Microsoft Innovate 2026 &bull; Team Code Of Thrones
      </footer>
    </div>
  );
};
