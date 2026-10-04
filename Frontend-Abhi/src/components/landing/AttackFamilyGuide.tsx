import React, { useState } from 'react';
import type { AttackFamily } from '../../types/api';
import { getAttackFamilyMark } from '../../icons';

interface FamilyDetail {
  id: AttackFamily;
  name: string;
  subtitle: string;
  description: string;
  flowCharacteristics: string[];
  mitreTactics: string[];
  stageCaught: string;
  stageReason: string;
}

const ATTACK_FAMILIES: FamilyDetail[] = [
  {
    id: 'dos',
    name: 'Denial of Service (DoS)',
    subtitle: 'High-volume resource exhaustion attacks',
    description:
      'Attempts to shut down a machine or network, making it inaccessible to its intended users by flooding targets with traffic or triggering crashes.',
    flowCharacteristics: [
      'count / srv_count: massive sudden spikes (> 500 connections / 2s)',
      'serror_rate / srv_serror_rate: elevated (> 0.85)',
      'dst_bytes: 0 or minimal payload return',
      'duration: near-zero per flow in SYN-floods',
    ],
    mitreTactics: ['TA0040: Impact', 'T1498: Network Denial of Service', 'T1499: Endpoint DoS'],
    stageCaught: 'Stage 2 (LightGBM) & Stage 1 (Isolation Forest)',
    stageReason:
      'Easily identified by Stage 2 supervised classifiers due to prominent volumetric feature signatures, backed by Stage 1 volumetric density spikes.',
  },
  {
    id: 'probe',
    name: 'Surveillance & Probing (Probe)',
    subtitle: 'Network mapping and vulnerability scanning',
    description:
      'Automated reconnaissance sweeps that scan ports and IP ranges to collect information or find known vulnerabilities prior to launching an attack.',
    flowCharacteristics: [
      'diff_srv_rate: high (> 0.70) across wide port ranges',
      'same_srv_rate: low (< 0.20)',
      'rerror_rate: elevated due to closed port resets',
      'dst_host_count: distributed horizontal port traversal',
    ],
    mitreTactics: ['TA0043: Reconnaissance', 'TA0007: Discovery', 'T1046: Network Service Discovery'],
    stageCaught: 'Stage 2 (LightGBM)',
    stageReason:
      'Well-defined statistical distributions in host and service variance features allow LightGBM to identify port sweeps with >94% PR-AUC.',
  },
  {
    id: 'r2l',
    name: 'Remote to Local (R2L)',
    subtitle: 'Unauthorized local access from remote machines',
    description:
      'Attacks where an external adversary without an account exploits vulnerabilities (FTP buffer overflows, dictionary attacks, phishing) to gain unauthorized access.',
    flowCharacteristics: [
      'count / srv_count: low volume (mimics normal interactive flows)',
      'duration: longer session spans with interactive pauses',
      'src_bytes: small input payload followed by high response dst_bytes',
      'num_failed_logins: > 0 on authentication ports',
    ],
    mitreTactics: ['TA0001: Initial Access', 'T1190: Exploit Public-Facing App', 'T1110: Brute Force'],
    stageCaught: 'Stage 1 (Isolation Forest) as Novel Suspicious',
    stageReason:
      'Stage 2 often mistakes stealthy R2L flows for Normal traffic. Stage 1 flags high anomaly indices due to subtle deviations in duration and byte asymmetry.',
  },
  {
    id: 'u2r',
    name: 'User to Root (U2R)',
    subtitle: 'Local privilege escalation to superuser',
    description:
      'Attacks where an adversary starts with local unprivileged account access and exploits system vulnerabilities (buffer overflows, race conditions) to gain root control.',
    flowCharacteristics: [
      'num_root / root_shell: > 0 indicators of elevated privileges',
      'num_file_creations: anomalous file manipulations',
      'hot: presence of privilege-escalation indicators',
      'count: single low-volume connection',
    ],
    mitreTactics: ['TA0004: Privilege Escalation', 'T1068: Exploitation for Privilege Escalation'],
    stageCaught: 'Stage 1 (Isolation Forest) as Novel Suspicious',
    stageReason:
      'Severely imbalanced training data causes supervised models to miss rare U2R flows. Stage 1 isolates the severe behavioral deviation from the noise floor.',
  },
];

export const AttackFamilyGuide: React.FC = () => {
  const [selectedFamily, setSelectedFamily] = useState<AttackFamily>('r2l');

  const current = ATTACK_FAMILIES.find((f) => f.id === selectedFamily) || ATTACK_FAMILIES[0];
  const CurrentIcon = getAttackFamilyMark(current.id);

  return (
    <section
      id="families"
      style={{
        padding: '64px 24px',
        backgroundColor: 'var(--bg-0)',
        borderTop: '1px solid var(--line)',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '32px' }}>
        <div className="label-caps" style={{ color: 'var(--accent)', marginBottom: '8px' }}>
          Threat Taxonomy
        </div>
        <h2 className="font-display" style={{ fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Attack Family Field Guide
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '68ch', marginTop: '6px' }}>
          Network attack behaviors categorized under the NSL-KDD and CIC-IDS taxonomy, and how SignSight's two stages isolate them.
        </p>
      </div>

      {/* Horizontal Tab Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          border: '1px solid var(--line)',
          backgroundColor: 'var(--bg-1)',
          marginBottom: '24px',
        }}
      >
        {ATTACK_FAMILIES.map((family) => {
          const Icon = getAttackFamilyMark(family.id);
          const isSelected = family.id === selectedFamily;
          return (
            <button
              key={family.id}
              type="button"
              onClick={() => setSelectedFamily(family.id)}
              style={{
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isSelected ? 'var(--bg-2)' : 'transparent',
                border: 'none',
                borderBottom: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'background-color 100ms ease',
              }}
            >
              <div style={{ color: isSelected ? 'var(--accent)' : 'var(--text-dim)' }}>
                <Icon size={24} />
              </div>
              <span
                className="font-mono"
                style={{
                  fontSize: '12px',
                  color: isSelected ? 'var(--text)' : 'var(--text-dim)',
                  fontWeight: isSelected ? 600 : 400,
                  textTransform: 'uppercase',
                }}
              >
                {family.id}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail Content Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-1)',
          border: '1px solid var(--line)',
          padding: '32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1.2fr) minmax(320px, 1fr)',
          gap: '32px',
        }}
      >
        {/* Left Column: Description & MITRE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <CurrentIcon size={28} />
              <h3 className="font-display" style={{ fontSize: '20px', color: 'var(--text)' }}>
                {current.name}
              </h3>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              {current.subtitle}
            </div>
          </div>

          <p style={{ color: 'var(--text)', fontSize: '14px', lineHeight: 1.6 }}>
            {current.description}
          </p>

          <div>
            <div className="label-caps" style={{ marginBottom: '8px' }}>
              Associated MITRE ATT&CK Tactics
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {current.mitreTactics.map((tactic) => (
                <span
                  key={tactic}
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    backgroundColor: 'var(--bg-2)',
                    border: '1px solid var(--line-strong)',
                    color: 'var(--text)',
                  }}
                >
                  {tactic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Flow Signatures & Stage Catch Rationale */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div className="label-caps" style={{ marginBottom: '10px' }}>
              Key NetFlow Vector Markers
            </div>
            <div
              style={{
                backgroundColor: 'var(--bg-2)',
                border: '1px solid var(--line)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {current.flowCharacteristics.map((char) => (
                <div key={char} className="font-mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                  • {char}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-2)',
              borderLeft: '3px solid var(--accent)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="label-caps" style={{ color: 'var(--accent)' }}>Detection Stage</span>
              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{current.stageCaught}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>
              {current.stageReason}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
