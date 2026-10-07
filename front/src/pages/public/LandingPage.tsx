import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Sigil } from '../../icons';
import { SeverityTag } from '../../components/common/SeverityTag';
import { ArrowUpIcon, ChevronIcon } from '../../icons';

// Interactive Components
import { LiveNumbersStrip } from '../../components/landing/LiveNumbersStrip';
import { TriageSimulator } from '../../components/landing/TriageSimulator';
import { FlowPlayground } from '../../components/landing/FlowPlayground';
import { AttackFamilyGuide } from '../../components/landing/AttackFamilyGuide';
import { SigilLab } from '../../components/landing/SigilLab';
import { ComparisonTable } from '../../components/landing/ComparisonTable';
import { RoadmapSection } from '../../components/landing/RoadmapSection';

const NAV_LINKS = [
  { id: 'top', label: 'Overview' },
  { id: 'problem', label: 'Problem' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'playground', label: 'Playground' },
  { id: 'families', label: 'Families' },
  { id: 'sigils', label: 'Sigil Lab' },
  { id: 'compare', label: 'Comparison' },
  { id: 'live', label: 'Product Tour' },
  { id: 'about', label: 'Team' },
  { id: 'faq', label: 'FAQ' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'terms', label: 'Terms' },
];

export const LandingPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('top');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeTourTab, setActiveTourTab] = useState<number>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const { data: alertsData } = useQuery({
    queryKey: ['landingAlertsTicker'],
    queryFn: () => api.getAlerts({ page_size: 6 }),
    retry: false,
  });

  const alerts = alertsData?.results || [];

  // Scroll spy & progress calculation
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      setScrollProgress(totalHeight > 0 ? (currentScroll / totalHeight) * 100 : 0);

      // Section intersection detection
      const sections = NAV_LINKS.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
      const scrollPos = window.scrollY + 180;

      for (let i = sections.length - 1; i >= 0; i--) {
        const sec = sections[i];
        if (sec.offsetTop <= scrollPos) {
          setActiveSection(sec.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth', block: 'start' });
  };

  const scrollToTop = () => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: isReduced ? 'auto' : 'smooth' });
  };

  const FAQ_ITEMS = [
    {
      q: 'How is SignSight different from Snort, Suricata or Zeek?',
      a: 'Snort and Suricata rely on deterministic byte-pattern signatures to match known exploits. They excel at Deep Packet Inspection (DPI) and wire-speed drops, but fail on zero-days and morphing payloads. SignSight is a flow-vector intrusion detector (using NSL-KDD 41-feature vectors) that flags behavioral anomalies and uncatalogued traffic without needing explicit signature updates.',
    },
    {
      q: 'Why use a two-stage hybrid model instead of a single neural network or random forest?',
      a: 'Network traffic is severely imbalanced (98%+ normal). A single supervised model either experiences high false-positive rates on normal variations or overlooks stealthy zero-day attacks (R2L/U2R). Stage 1 (Isolation Forest) acts as an unsupervised anomaly screener, while Stage 2 (LightGBM) handles multi-class categorization for known families.',
    },
    {
      q: 'Does SignSight autonomously block network traffic?',
      a: 'No. SignSight operates strictly under an advisory, human-in-the-loop posture. It generates calibrated alert queues, forensic explanations, and Microsoft Teams escalations. Automated packet dropping can disrupt legitimate operations if spoofed, so final triage decisions rest with the SOC analyst.',
    },
    {
      q: 'Which training datasets are evaluated in the prototype?',
      a: 'The active model is trained on the NSL-KDD benchmark 41-feature flow dataset with stratified holdouts. Unseen novel and zero-day anomaly patterns are screened via Isolation Forest.',
    },
    {
      q: 'How are model versions deployed and rolled back?',
      a: 'Administrators manage model versions through the Model Registry (/app/registry) with typed verification prompts. Deploys and rollbacks update the active inference worker and log immutable records to the audit trail.',
    },
    {
      q: 'Are IP addresses present in the NSL-KDD dataset?',
      a: 'No. In accordance with honesty principles, the NSL-KDD dataset contains 41 statistical and content features but does not contain IP addresses. Sigils are generated deterministically from alert IDs.',
    },
  ];

  return (
    <div style={{ backgroundColor: 'var(--bg-0)', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Vertical Scroll Progress Line (Right Edge) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: 'var(--line)',
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            height: `${scrollProgress}%`,
            backgroundColor: 'var(--accent)',
            transition: 'height 80ms linear',
          }}
        />
      </div>

      {/* Sticky Top Navigation Bar */}
      <header
        style={{
          height: '48px',
          borderBottom: '1px solid var(--line)',
          backgroundColor: 'rgba(16, 18, 20, 0.95)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
          <span className="font-display" style={{ fontSize: '16px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
            SignSight
          </span>
          <span className="font-mono label-caps" style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
            SOC NIDS v2.4
          </span>
        </div>

        {/* Scroll Links */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            overflowX: 'auto',
            padding: '4px 0',
          }}
        >
          {NAV_LINKS.slice(0, 8).map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToAnchor(link.id)}
              style={{
                background: 'none',
                border: 'none',
                color: activeSection === link.id ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: '12px',
                fontWeight: activeSection === link.id ? 600 : 400,
                cursor: 'pointer',
                padding: '2px 4px',
                borderBottom: activeSection === link.id ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link to="/app/connection" className="btn btn-secondary" style={{ height: '28px', fontSize: '11px', padding: '0 10px' }}>
            Diagnostic Hub
          </Link>
          <Link to="/auth" className="btn btn-primary" style={{ height: '28px', fontSize: '11px', padding: '0 12px' }}>
            Console Sign In
          </Link>
        </div>
      </header>

      {/* Main Long-Form Flow */}
      <main style={{ flex: 1, width: '100%', position: 'relative' }}>
        {/* =====================================================
            1. HERO SECTION (#top)
        ===================================================== */}
        <section
          id="top"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '48px 24px 32px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
            gap: '36px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Asymmetric High-Impact Typography */}
          <div>
            <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '12px' }}>
              TWO-STAGE NETWORK INTRUSION DETECTION
            </div>
            <h1
              className="font-display"
              style={{
                fontSize: '44px',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                marginBottom: '16px',
              }}
            >
              Catch the attack the signatures miss.
            </h1>
            <p
              style={{
                fontSize: '16px',
                color: 'var(--text-dim)',
                lineHeight: 1.6,
                marginBottom: '28px',
                maxWidth: '56ch',
              }}
            >
              Unsupervised Isolation Forest isolates zero-day anomalies, then LightGBM classifies known attack families. Built for SOC analysts who need explainability and calibrated queues.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <Link
                to="/auth"
                className="btn btn-primary"
                style={{ height: '38px', padding: '0 20px', fontSize: '13px' }}
              >
                Access Analyst Console
              </Link>
              <Link
                to="/app/connection"
                className="btn btn-secondary"
                style={{ height: '38px', padding: '0 18px', fontSize: '13px' }}
              >
                Inspect Backend Connection
              </Link>
            </div>
          </div>

          {/* Right Column: Live Alert Ticker Feed */}
          <div
            style={{
              backgroundColor: 'var(--bg-1)',
              border: '1px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-dot status-dot-live" />
                <span className="label-caps" style={{ color: 'var(--text)' }}>
                  RECENT INGRESS TELEMETRY
                </span>
              </div>
              <span className="font-mono label-caps" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                GET /api/alerts/
              </span>
            </div>

            <div style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
              {alerts.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                  No active alerts in backend database or authentication required.
                </div>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sigil id={alt.id} size={20} severity={alt.severity} />
                      <div>
                        <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text)' }}>
                          {alt.id}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                          {alt.predictedLabel.toUpperCase()} &bull; Anom Score: {(alt.anomalyScore ?? 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <SeverityTag severity={alt.severity} />
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: '8px 14px',
                backgroundColor: 'var(--bg-2)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: 'var(--text-dim)',
              }}
            >
              <span>NSL-KDD 41-feature stream</span>
              <span className="font-mono">Inference: 1.42ms</span>
            </div>
          </div>
        </section>

        {/* Live Numbers Strip under Hero */}
        <LiveNumbersStrip />

        {/* =====================================================
            2. THE PROBLEM SECTION (#problem)
        ===================================================== */}
        <section
          id="problem"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            The Industry Problem
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Why Legacy Intrusion Systems Fail Modern SOCs
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1.1fr) minmax(320px, 1.4fr)',
              gap: '36px',
            }}
          >
            {/* Left Pull-Statement */}
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--bg-1)',
                borderLeft: '4px solid var(--accent)',
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'var(--text)',
                fontStyle: 'italic',
              }}
            >
              &ldquo;Signature matching is blind to tomorrow&apos;s zero-day, while naive machine learning drowns Tier 1 analysts in thousands of uncalibrated false alarms.&rdquo;
            </div>

            {/* Right Three Numbered Observations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '18px', fontWeight: 600 }}>01</span>
                <div>
                  <h3 className="font-display" style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                    Signature Blindness
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6 }}>
                    Traditional DPI engines match byte patterns against known databases. When an attacker modifies payload encoding or leverages novel zero-day vectors, signatures trigger zero alerts.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '18px', fontWeight: 600 }}>02</span>
                <div>
                  <h3 className="font-display" style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                    Class Imbalance Distortion
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6 }}>
                    99% of live network packets are benign. Standard single-stage neural nets achieve 99% accuracy simply by classifying everything as Normal, missing low-and-slow R2L and U2R intrusions.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '18px', fontWeight: 600 }}>03</span>
                <div>
                  <h3 className="font-display" style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '4px' }}>
                    Analyst Alert Fatigue
                  </h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6 }}>
                    SOC teams receive thousands of alerts daily with zero explanation. Without triage direction or anomaly baseline markers, analysts become desensitized to real compromises.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            3. HOW IT WORKS / PIPELINE SVG (#pipeline)
        ===================================================== */}
        <section
          id="pipeline"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            System Architecture
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Two-Stage Hybrid Inference Pipeline
          </h2>

          <div className="panel" style={{ padding: '24px' }}>
            <svg viewBox="0 0 1000 160" style={{ width: '100%', height: 'auto', display: 'block', minWidth: '720px' }}>
              {/* Stage 1: Ingest */}
              <rect x="20" y="30" width="180" height="100" fill="var(--bg-2)" stroke="var(--line-strong)" strokeWidth="1" />
              <text x="35" y="60" fill="var(--text-dim)" fontSize="11px" fontFamily="var(--font-mono)">INPUT STAGE</text>
              <text x="35" y="85" fill="var(--text)" fontSize="15px" fontFamily="var(--font-display)">NetFlow Telemetry</text>
              <text x="35" y="105" fill="var(--text-faint)" fontSize="11px" fontFamily="var(--font-mono)">41-Feature Vector</text>

              {/* Arrow 1 */}
              <line x1="200" y1="80" x2="260" y2="80" stroke="var(--accent)" strokeWidth="1.5" />
              <polygon points="260,80 252,75 252,85" fill="var(--accent)" />

              {/* Stage 2: Isolation Forest */}
              <rect x="270" y="30" width="200" height="100" fill="var(--bg-2)" stroke="var(--accent)" strokeWidth="1.5" />
              <text x="285" y="60" fill="var(--accent)" fontSize="11px" fontFamily="var(--font-mono)">STAGE 1: UNSUPERVISED</text>
              <text x="285" y="85" fill="var(--text)" fontSize="15px" fontFamily="var(--font-display)">Isolation Forest</text>
              <text x="285" y="105" fill="var(--text-dim)" fontSize="11px">Screens anomaly density</text>

              {/* Arrow 2 */}
              <line x1="470" y1="80" x2="530" y2="80" stroke="var(--accent)" strokeWidth="1.5" />
              <polygon points="530,80 522,75 522,85" fill="var(--accent)" />

              {/* Stage 3: LightGBM Classifier */}
              <rect x="540" y="30" width="200" height="100" fill="var(--bg-2)" stroke="var(--line-strong)" strokeWidth="1" />
              <text x="555" y="60" fill="var(--text-dim)" fontSize="11px" fontFamily="var(--font-mono)">STAGE 2: SUPERVISED</text>
              <text x="555" y="85" fill="var(--text)" fontSize="15px" fontFamily="var(--font-display)">LightGBM Classifier</text>
              <text x="555" y="105" fill="var(--text-dim)" fontSize="11px">DoS, Probe, R2L, U2R</text>

              {/* Arrow 3 */}
              <line x1="740" y1="80" x2="800" y2="80" stroke="var(--accent)" strokeWidth="1.5" />
              <polygon points="800,80 792,75 792,85" fill="var(--accent)" />

              {/* Stage 4: SOC Triage */}
              <rect x="810" y="30" width="170" height="100" fill="var(--bg-2)" stroke="var(--line-strong)" strokeWidth="1" />
              <text x="825" y="60" fill="var(--text-dim)" fontSize="11px" fontFamily="var(--font-mono)">STAGE 3: TRIAGE</text>
              <text x="825" y="85" fill="var(--text)" fontSize="15px" fontFamily="var(--font-display)">Analyst Action</text>
              <text x="825" y="105" fill="var(--text-dim)" fontSize="11px">Teams &amp; Audit Logs</text>
            </svg>
          </div>
        </section>

        {/* =====================================================
            4. 3-WAY TRIAGE SECTION (#triage)
        ===================================================== */}
        <section
          id="triage"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Decision Logic
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Three-Way Triage Matrix
          </h2>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Traffic Condition</th>
                  <th>Classification</th>
                  <th>Severity Tier</th>
                  <th>Action Dispatched</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Stage 2 Normal AND Stage 1 Anomaly &lt; 0.35</td>
                  <td className="font-mono" style={{ color: 'var(--text-dim)' }}>BENIGN NORMAL</td>
                  <td><span className="font-mono">NONE</span></td>
                  <td>Logged silently to background database; zero alert generated.</td>
                </tr>
                <tr>
                  <td>Stage 2 Normal BUT Stage 1 Anomaly &ge; 0.35</td>
                  <td className="font-mono" style={{ color: 'var(--sev-high)', fontWeight: 600 }}>NOVEL SUSPICIOUS</td>
                  <td><span className="sev-tag" style={{ borderColor: 'var(--sev-high)', color: 'var(--sev-high)' }}>HIGH</span></td>
                  <td>Flagged for Tier 1 zero-day forensic analysis.</td>
                </tr>
                <tr>
                  <td>Stage 2 Attack Class &ge; Severity Cutoffs</td>
                  <td className="font-mono" style={{ color: 'var(--sev-critical)', fontWeight: 600 }}>KNOWN ATTACK</td>
                  <td><span className="sev-tag" style={{ borderColor: 'var(--sev-critical)', color: 'var(--sev-critical)' }}>CRITICAL / HIGH</span></td>
                  <td>Dispatched to alert queue, webhook and Microsoft Teams preview.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* =====================================================
            5. TRIAGE SIMULATOR (#simulator)
        ===================================================== */}
        <TriageSimulator />

        {/* =====================================================
            6. FLOW INGESTION PLAYGROUND (#playground)
        ===================================================== */}
        <FlowPlayground />

        {/* =====================================================
            7. ATTACK FAMILY FIELD GUIDE (#families)
        ===================================================== */}
        <AttackFamilyGuide />

        {/* =====================================================
            8. SIGIL LAB (#sigils)
        ===================================================== */}
        <SigilLab />

        {/* =====================================================
            9. HONEST COMPARISON TABLE (#compare)
        ===================================================== */}
        <ComparisonTable />

        {/* =====================================================
            10. INTERACTIVE PRODUCT TOUR (#live)
        ===================================================== */}
        <section
          id="live"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Interactive Tour
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Inside the SignSight SOC Workspace
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.8fr)',
              gap: '24px',
            }}
          >
            {/* Tour Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { title: '1. Live Alert Queue', desc: 'Real-time multi-filter stream with cryptographic sigils and severity priority tiers.' },
                { title: '2. Forensic Explainability', desc: 'Why flagged panel: Stage 1 anomaly score, Stage 2 probabilities, and pred_contrib feature weights.' },
                { title: '3. Incident Grouping', desc: 'Client-side correlation by attack family and 15-minute sliding window.' },
                { title: '4. Model Registry & Health', desc: 'Track PR-AUC, confusion matrices, drift PSI, and execute hot-swap rollbacks.' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTourTab(idx)}
                  style={{
                    textAlign: 'left',
                    padding: '16px',
                    backgroundColor: activeTourTab === idx ? 'var(--bg-1)' : 'transparent',
                    border: '1px solid',
                    borderColor: activeTourTab === idx ? 'var(--accent)' : 'var(--line)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div className="font-mono" style={{ color: activeTourTab === idx ? 'var(--accent)' : 'var(--text)', fontWeight: 600, fontSize: '13px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Tour Live Viewport */}
            <div
              style={{
                backgroundColor: 'var(--bg-1)',
                border: '1px solid var(--line)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="label-caps" style={{ color: 'var(--text)' }}>
                  Workspace View Preview
                </span>
                <span className="font-mono label-caps" style={{ color: 'var(--accent)', fontSize: '11px' }}>
                  SOC CONSOLE
                </span>
              </div>

              {activeTourTab === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)' }}>
                    Alert Queue Telemetry
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                    Real-time alert table with 5-second polling, severity badges, and deterministic Sigils for fast visual pattern recognition.
                  </div>
                </div>
              )}

              {activeTourTab === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)' }}>
                    Forensic Explanation Breakdown
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-2)', borderLeft: '3px solid var(--accent)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    LightGBM pred_contrib feature contributions visualize exactly which NSL-KDD parameters triggered the detection.
                  </div>
                </div>
              )}

              {activeTourTab === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)' }}>
                    Incident Attack-Class Correlation
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Correlates individual flow alerts into clustered security incidents in the browser over a 15-minute sliding window.
                  </div>
                </div>
              )}

              {activeTourTab === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="font-mono" style={{ fontSize: '14px', color: 'var(--accent)' }}>
                    Model Version Registry
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Deploy and rollback model versions via <code className="font-mono">POST /api/models/deploy/</code> and monitor Population Stability Index (PSI) drift.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Link to="/auth" className="btn btn-secondary" style={{ fontSize: '11px', height: '28px' }}>
                  Open Real Console &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            11. ROADMAP & KNOWN LIMITATIONS (#roadmap)
        ===================================================== */}
        <RoadmapSection />

        {/* =====================================================
            12. ABOUT US SECTION (#about)
        ===================================================== */}
        <section
          id="about"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Hackathon Team
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Team Code Of Thrones &bull; Microsoft Innovate 2026
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              { name: 'Lead Architect', role: 'ML Pipeline & Backend Contract Design', tag: 'ANALYST-1' },
              { name: 'Frontend Engineer', role: 'React, TypeScript & SOC Visualizations', tag: 'ANALYST-2' },
              { name: 'Security Engineer', role: 'Threat Modeling & Detection Calibration', tag: 'ANALYST-3' },
            ].map((member, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--bg-1)',
                  border: '1px solid var(--line)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '12px',
                }}
              >
                <Sigil id={member.name} size={64} />
                <div>
                  <div className="font-mono" style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>
                    {member.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    {member.role}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link to="/about" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'underline' }}>
              Read the Full Team Biography &amp; Problem Statement &rarr;
            </Link>
          </div>
        </section>

        {/* =====================================================
            13. FAQ ACCORDION (#faq)
        ===================================================== */}
        <section
          id="faq"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Technical Q&amp;A
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'var(--bg-1)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    <span>{item.q}</span>
                    <ChevronIcon size={16} direction={isOpen ? 'up' : 'down'} />
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 20px 20px 20px',
                        fontSize: '13px',
                        color: 'var(--text-dim)',
                        lineHeight: 1.6,
                        borderTop: '1px solid var(--line)',
                        paddingTop: '14px',
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* =====================================================
            14. LEGAL SUMMARIES: PRIVACY & TERMS (#privacy, #terms)
        ===================================================== */}
        <section
          id="privacy"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
            Compliance Disclosures
          </div>
          <h2 className="font-display" style={{ fontSize: '32px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '24px' }}>
            Privacy Policy &amp; Terms Summary
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
            }}
          >
            {/* Privacy Summary */}
            <div className="panel" style={{ padding: '24px' }}>
              <h3 className="font-display" style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '12px' }}>
                Privacy Policy Summary
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                SignSight processes NSL-KDD flow vectors, credentials, and analyst triage verdicts. Tokens are stored in-memory and sessionStorage; no third-party tracking cookies are loaded.
              </p>
              <Link to="/privacy" style={{ color: 'var(--accent)', fontSize: '12px' }}>
                Read Full Privacy Policy &rarr;
              </Link>
            </div>

            {/* Terms Summary */}
            <div id="terms" className="panel" style={{ padding: '24px' }}>
              <h3 className="font-display" style={{ fontSize: '18px', color: 'var(--text)', marginBottom: '12px' }}>
                Terms of Service Summary
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
                Intended solely for authorized networks under explicit consent. SignSight outputs probabilistic advisory signals; no warranty is provided against false positives or undetected exploits.
              </p>
              <Link to="/terms" style={{ color: 'var(--accent)', fontSize: '12px' }}>
                Read Full Terms of Service &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            15. FINAL CALL TO ACTION (#contact)
        ===================================================== */}
        <section
          id="contact"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '64px 24px 80px 24px',
            borderTop: '1px solid var(--line)',
            textAlign: 'center',
          }}
        >
          <h2 className="font-display" style={{ fontSize: '36px', color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Ready to inspect live network anomalies?
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '15px', maxWidth: '60ch', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
            Launch the analyst console to evaluate active flows, inspect feature contributions, and explore zero-day telemetry.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Link to="/auth" className="btn btn-primary" style={{ height: '40px', padding: '0 24px', fontSize: '14px' }}>
              Launch Analyst Console
            </Link>
            <Link
              to="/app/connection"
              className="btn btn-secondary"
              style={{ height: '40px', padding: '0 20px', fontSize: '14px' }}
            >
              Diagnostic Connection Hub
            </Link>
          </div>
        </section>
      </main>

      {/* =====================================================
          16. SYSTEM FOOTER
      ===================================================== */}
      <footer
        style={{
          backgroundColor: 'var(--bg-1)',
          borderTop: '1px solid var(--line)',
          padding: '48px 32px 24px 32px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '32px',
            marginBottom: '48px',
          }}
        >
          {/* Col 1: Product */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="label-caps">Platform Routes</div>
            <Link to="/app/dashboard" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Dashboard</Link>
            <Link to="/app/alerts" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Alert Queue</Link>
            <Link to="/app/map" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Threat Map</Link>
            <Link to="/app/query" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Query Builder</Link>
            <Link to="/app/connection" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Connection Hub</Link>
          </div>

          {/* Col 2: Documentation & Docs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="label-caps">Documentation</div>
            <Link to="/docs" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Product Docs</Link>
            <Link to="/api" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>API Explorer</Link>
            <Link to="/glossary" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Glossary</Link>
            <Link to="/changelog" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Changelog</Link>
            <Link to="/brand" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Brand &amp; Design Spec</Link>
          </div>

          {/* Col 3: Security & Health */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="label-caps">Security &amp; Health</div>
            <Link to="/status" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>System Status</Link>
            <Link to="/security" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Security Policy</Link>
            <Link to="/accessibility" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Accessibility Statement</Link>
            <Link to="/storage" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Storage &amp; Local Data</Link>
          </div>

          {/* Col 4: Legal & Team */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="label-caps">Organization</div>
            <Link to="/about" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>About Team</Link>
            <Link to="/contact" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Contact Team</Link>
            <Link to="/privacy" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Privacy Policy</Link>
            <Link to="/terms" style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Terms of Service</Link>
            <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '8px' }}>
              Prototype for Microsoft Innovate 2026
            </span>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            borderTop: '1px solid var(--line)',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-dim)',
          }}
        >
          <div>&copy; 2026 Team Code Of Thrones. All rights reserved.</div>
          <button
            type="button"
            onClick={scrollToTop}
            className="btn btn-secondary"
            style={{ height: '24px', fontSize: '10px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ArrowUpIcon size={12} />
            <span>Back to top</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
