# SignSight — Hackathon Judge Demo Script

> **Target Duration**: 90 seconds (with 60-second backup elevator script).  
> **Audience**: Microsoft Innovate Hackathon 2026 Judges & Technical Evaluators.  
> **Key Value Proposition**: Solving SOC alert fatigue and zero-day intrusion detection by marrying deterministic cryptographic Sigil glyphs with a two-stage hybrid ML pipeline.

---

## ⏱️ 90-Second Main Demo Script

### [00:00 - 00:15] Hook & Problem (Landing Page `/`)
- **Action**: Start at `http://localhost:5173/`. Scroll smoothly past the hero to the **Live Numbers Strip** and **Sigil Lab**.
- **Speaker**:
  > *"Every day, SOC analysts stare at endless tables of raw IP addresses. At high volume, humans suffer alert fatigue and miss novel zero-day attacks. SignSight fixes this in two ways: first, with **deterministic cryptographic Sigils** that give every IP a memorable geometric fingerprint; second, with a **two-stage hybrid ML pipeline**."*

### [00:15 - 00:35] The Sigil & Triage Queue (`/app/alerts`)
- **Action**: Click **"Enter Console"** or press `Ctrl+K` &rarr; Enter. Press `J` and `K` to navigate the queue.
- **Speaker**:
  > *"Notice how the glyphs make repeat attacker IPs instantly recognizable without reading tabular numbers. Using Vim-style keyboard shortcuts, analysts can review, escalate (`E`), or commit True/False Positive verdicts (`T`/`F`) in fractions of a second. Stage 1 Isolation Forest scores catch anomalies, while Stage 2 LightGBM delivers multi-class family confidence."*

### [00:35 - 00:55] Explainability & Microsoft Teams Integration (`/app/alerts/:id`)
- **Action**: Press `Enter` on a Critical alert (e.g. `DOS-SYN-001`). Scroll down to the **Why Flagged (SHAP / Feature Weights)** panel and toggle the **Microsoft Teams Card Preview**.
- **Speaker**:
  > *"When an alert is flagged, we don't just output a black-box score. We show the exact top feature weights that triggered the anomaly. With one click, analysts can generate a validated Microsoft Teams Adaptive Card to escalate directly to Tier 2 incident response channels."*

### [00:55 - 01:15] Geospatial Threat Mapping & Correlated Incidents (`/app/map` & `/app/incidents`)
- **Action**: Jump to `/app/map` and toggle between **2D Mercator** and **3D Orthographic Globe**. Then navigate to `/app/incidents`.
- **Speaker**:
  > *"Our geospatial engine maps ingress vectors globally with country clustering. In the Incidents view, SignSight automatically clusters related flow alerts into a unified kill chain mapped strictly to MITRE ATT&CK tactics, ready for export as a Markdown report."*

### [01:15 - 01:30] Results Benchmark & Wrap-Up (`/app/results`)
- **Action**: Navigate to `/app/results`. Point to the side-by-side comparison table and the Novel Suspicious catch rate.
- **Speaker**:
  > *"Our two-stage hybrid model outperforms standalone LightGBM with a **+0.042 Macro F1 improvement** and catches **84.3% of zero-day attacks** that bypass standard classifiers. Built from scratch with zero third-party component libraries and strict token-driven ergonomics. Thank you!"*

---

## ⚡ 60-Second Backup Elevator Script

| Second | Visual Focus | Spoken Line |
|---|---|---|
| **00:00 - 00:15** | `/` (Hero + Sigil Lab) | *"SignSight transforms raw network telemetry into visual cryptographic Sigil glyphs, slashing SOC cognitive load and triage time."* |
| **00:15 - 00:30** | `/app/alerts` & `/app/alerts/:id` | *"Our two-stage engine gates traffic through an Isolation Forest for zero-day anomalies, then classifies families with LightGBM and full feature explainability."* |
| **00:30 - 00:45** | `/app/incidents` & Teams Card | *"We cluster alerts into multi-stage MITRE kill chains and generate ready-to-dispatch Microsoft Teams Adaptive Cards for seamless SOC escalation."* |
| **00:45 - 01:00** | `/app/results` | *"The result is a +0.042 F1 increase, 84.3% zero-day detection, and a rock-solid, accessible interface built for high-throughput analysts."* |

---

## 🎯 Emergency Backup Steps (If Network / Backend Fails)
1. The app includes **built-in mock fallbacks** for all API endpoints. If the backend server is offline, the status strip will display `DEMO DATA` / `DEGRADED`, and all features (interactive charts, 3D globe, triage filters, CSV export) will continue functioning seamlessly.
2. Click **"Run 90s Demo"** in the top bar to run the autonomous narrator overlay that steps through every slide automatically.
