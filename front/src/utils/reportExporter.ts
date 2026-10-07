import type { UIAlertDetail } from '../types/api';
import type { Incident } from './incidentGrouper';

export function exportAlertToMarkdown(alert: UIAlertDetail, modelVersion = 'active'): string {
  const generatedAt = new Date().toUTCString();
  let md = `# SignSight Forensic Incident Report: Alert ${alert.id}
Generated: ${generatedAt}
Active Model Version: ${alert.modelVersion || modelVersion}
Classification Posture: Advisory SOC Telemetry

---

## 1. Executive Summary
- **Alert ID:** \`${alert.id}\`
- **Assigned Severity:** **${alert.severity.toUpperCase()}**
- **Identified Attack Family:** ${(alert.predictedLabel || 'NORMAL').toUpperCase()}
- **Stage 1 Anomaly Score:** ${alert.anomalyScore !== undefined ? alert.anomalyScore.toFixed(3) : 'N/A'}
- **Stage 2 Prediction Confidence:** ${(alert.confidence * 100).toFixed(1)}%
- **Triage Status:** ${alert.status.toUpperCase()}
- **Alert Type:** ${alert.alertType || 'known_attack'}

---

## 2. Telemetry Context
- **Dataset:** NSL-KDD 41-feature vector (IPs null in dataset)
- **Sigil:** Derived from alert ID \`${alert.id}\`
- **Timestamp:** ${alert.createdAt}

---

## 3. Explainability (Feature Contributions)
`;

  if (alert.explanation?.topFeatures && alert.explanation.topFeatures.length > 0) {
    md += '| Feature Name | Contribution Weight |\n| :--- | :--- |\n';
    alert.explanation.topFeatures.forEach((f) => {
      const weight = typeof f.contribution === 'number' ? f.contribution : 0;
      md += `| \`${f.feature}\` | ${weight > 0 ? `+${weight.toFixed(4)}` : weight.toFixed(4)} |\n`;
    });
  } else {
    md += '_Feature contributions (pred_contrib) not present in payload._\n';
  }

  md += `\n---\n\n## 4. Analyst Notes\n${alert.notes || '_No analyst notes recorded._'}\n\n---\n_SignSight SOC Intrusion Detection Platform &bull; Microsoft Innovate 2026_\n`;

  return md;
}

export function exportIncidentToMarkdown(incident: Incident, modelVersion = 'active'): string {
  const generatedAt = new Date().toUTCString();
  let md = `# SignSight Correlated Incident Report: ${incident.id}
Generated: ${generatedAt}
Active Model Version: ${modelVersion}
Incident Aggregation: Grouped in browser by attack class and time (15-minute sliding window)

---

## 1. Incident Overview
- **Incident Identifier:** \`${incident.id}\`
- **Attack Family:** ${incident.attack_family.toUpperCase()}
- **Aggregated Severity:** **${incident.severity.toUpperCase()}**
- **Total Flow Alerts:** ${incident.alert_count}
- **First Activity Seen:** ${incident.first_seen}
- **Last Activity Seen:** ${incident.last_seen}
- **Status:** ${incident.status.toUpperCase()}

---

## 2. Clustered Alert Timeline
| Timestamp | Alert ID | Severity | Anomaly Score | Confidence | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
`;

  incident.alerts.forEach((alt) => {
    md += `| ${alt.createdAt} | \`${alt.id}\` | ${alt.severity.toUpperCase()} | ${alt.anomalyScore !== undefined ? alt.anomalyScore.toFixed(3) : 'N/A'} | ${(alt.confidence * 100).toFixed(0)}% | ${alt.status.toUpperCase()} |\n`;
  });

  md += '\n---\n_SignSight SOC Intrusion Detection Platform &bull; Microsoft Innovate 2026_\n';
  return md;
}

export function downloadFile(content: string, filename: string, mimeType = 'text/markdown') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
