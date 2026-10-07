import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from '../../icons';

interface GlossaryItem {
  id: string;
  term: string;
  category: 'ML & Data' | 'SOC Workflow' | 'Network Telemetry';
  definition: string;
  appRoute: string;
  appRouteLabel: string;
}

const GLOSSARY_TERMS: GlossaryItem[] = [
  {
    id: 'anomaly-score',
    term: 'Anomaly Score',
    category: 'ML & Data',
    definition:
      'Continuous metric between 0.0 and 1.0 output by Stage 1 (Isolation Forest). Scores exceeding the noise floor baseline (default 0.35) indicate severe deviation from nominal network flow distributions.',
    appRoute: '/app/alerts',
    appRouteLabel: 'Alert Queue / Detail',
  },
  {
    id: 'novel-suspicious',
    term: 'Novel Suspicious',
    category: 'SOC Workflow',
    definition:
      'A triage classification triggered when Stage 2 (LightGBM) predicts a flow as Normal, but Stage 1 calculates an anomalous deviation above threshold. Flags potential zero-days and stealthy intrusions.',
    appRoute: '/app/results',
    appRouteLabel: 'Results Benchmark',
  },
  {
    id: 'pr-auc',
    term: 'PR-AUC (Precision-Recall Area Under Curve)',
    category: 'ML & Data',
    definition:
      'Evaluation benchmark metric preferred over ROC-AUC for severely imbalanced network intrusion data (where normal traffic comprises >98% of flows). Quantifies detection quality on rare attack classes.',
    appRoute: '/app/results',
    appRouteLabel: 'Results Comparison',
  },
  {
    id: 'fpr',
    term: 'False Positive Rate (FPR)',
    category: 'ML & Data',
    definition:
      'The proportion of benign normal flows erroneously flagged as intrusions. In SOC operations, minimizing FPR is essential to prevent analyst alert fatigue.',
    appRoute: '/app/results',
    appRouteLabel: 'Model Health & Results',
  },
  {
    id: 'concept-drift',
    term: 'Concept Drift',
    category: 'ML & Data',
    definition:
      'Statistical divergence in network telemetry features over time (measured via Wasserstein distance or population stability index). Drift scores exceeding 0.15 indicate a need for model retraining.',
    appRoute: '/app/drift',
    appRouteLabel: 'Drift Monitor',
  },
  {
    id: 'netflow-5tuple',
    term: 'NetFlow 5-Tuple',
    category: 'Network Telemetry',
    definition:
      'The foundational network flow identifier consisting of Source IP, Destination IP, Source Port, Destination Port, and Protocol (TCP/UDP/ICMP).',
    appRoute: '/app/ingest',
    appRouteLabel: 'Ingest & Flow Vectors',
  },
  {
    id: 'sigil',
    term: 'Sigil',
    category: 'SOC Workflow',
    definition:
      'A deterministic 5x5 mirrored geometric icon generated locally via FNV-1a hashing of an IP address or Alert ID. Provides instant visual recognition across tables and map clusters.',
    appRoute: '/app/alerts',
    appRouteLabel: 'Identity Visualizer',
  },
  {
    id: 'feedback-loop',
    term: 'Analyst Feedback Loop',
    category: 'SOC Workflow',
    definition:
      'Human-in-the-loop triage verdicts (True Positive / False Positive) committed by analysts. Archived for candidate retraining dataset export.',
    appRoute: '/app/feedback',
    appRouteLabel: 'Feedback Loop',
  },
];

export const GlossaryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = GLOSSARY_TERMS.filter((item) => {
    const matchesSearch =
      item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ backgroundColor: 'var(--bg-0)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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
              SignSight Glossary
            </span>
          </Link>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            NIDS SOC TERMINOLOGY
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/docs" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Documentation</Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Knowledge Repository
        </div>
        <h1 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
          Cybersecurity &amp; SOC Glossary
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginBottom: '28px', lineHeight: 1.6 }}>
          Standard technical terminology and mathematical definitions implemented in SignSight.
        </p>

        {/* Search & Category Filter Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <input
              type="text"
              className="input input-mono"
              placeholder="Search glossary terms or definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: '36px', paddingLeft: '32px' }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }}>
              <SearchIcon size={16} />
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'ML & Data', 'SOC Workflow', 'Network Telemetry'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className="btn btn-secondary"
                style={{
                  height: '36px',
                  fontSize: '11px',
                  padding: '0 10px',
                  backgroundColor: selectedCategory === cat ? 'var(--bg-2)' : 'transparent',
                  borderColor: selectedCategory === cat ? 'var(--accent)' : 'var(--line)',
                  color: selectedCategory === cat ? 'var(--accent)' : 'var(--text-dim)',
                }}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Terms List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              id={item.id}
              className="panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 className="font-display" style={{ fontSize: '18px', color: 'var(--text)' }}>
                    {item.term}
                  </h2>
                  <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
                    [{item.category}]
                  </span>
                </div>
                <Link
                  to={item.appRoute}
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-mono)',
                    textDecoration: 'underline',
                  }}
                >
                  View in {item.appRouteLabel} &rarr;
                </Link>
              </div>

              <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                {item.definition}
              </p>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No glossary terms matched query &ldquo;{searchTerm}&rdquo;.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', backgroundColor: 'var(--bg-1)', padding: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)' }}>
        SignSight Glossary Reference &bull; Microsoft Innovate 2026
      </footer>
    </div>
  );
};
