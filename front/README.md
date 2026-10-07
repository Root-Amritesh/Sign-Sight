# SignSight — AI-Powered Security Operations Console

> **Real-time network intrusion triage with two-stage hybrid machine learning and cryptographic Sigil glyph identification.** Built for the **Microsoft Innovate Hackathon 2026**.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🛡️ Executive Summary

Modern SOC analysts suffer from telemetry overload: thousands of tabular IP logs flood queues every minute, causing fatigue and missed zero-day intrusions. **SignSight** bridges visual cognitive ergonomics and advanced machine learning to deliver sub-second triage:

1. **Deterministic Cryptographic Sigils**: IP addresses and flow features are hashed via FNV-1a into distinct, high-contrast geometric vector glyphs. Analysts instantly recognize repeat threat actors across alert feeds, query logs, and geospatial maps before reading a single digit.
2. **Two-Stage Hybrid Inference Engine**:
   - **Stage 1 (Isolation Forest)**: Detects novel anomalies and zero-day deviations (`anomaly_score > 0.50`).
   - **Stage 2 (LightGBM Classifier)**: Pinpoints multi-class threat families (`DoS`, `Probe`, `R2L`, `U2R`, `Normal`) with calibrated probability distributions.
3. **Microsoft Ecosystem Synergy**:
   - **Adaptive Cards for Microsoft Teams**: One-click webhook payload generator and instant JSON preview for SOC incident handoff.
   - **Microsoft Entra ID (Azure AD)**: SSO architecture with token caching and mock fallback for zero-downtime offline demonstrations.

---

## 🚀 Key Features & Pages

| Route | Page / Feature | Description |
|---|---|---|
| `/` | **Interactive Editorial Landing** | Long-form case study featuring Live Numbers Strip, Triage Simulator, Flow Playground, Attack Family Guide, Sigil Lab, Benchmark Comparison, and Roadmap. |
| `/app/dashboard` | **SOC Command Dashboard** | Real-time throughput KPI cards, attack family distribution charts, severity breakdown, and live alert feed. |
| `/app/alerts` | **Alert Triage Queue** | High-density tabular triage list with 5s polling, search filter, bulk actions, and Vim-style keyboard shortcuts (`J`/`K`/`E`/`R`/`T`/`F`). |
| `/app/alerts/:id` | **Forensic Detail View** | Deep-dive feature importances (SHAP/LGBM weights), packet payload inspector, Microsoft Teams Card preview, and audit trail. |
| `/app/incidents` | **Correlated Incidents** | Client-side rule-based clustering grouping related flow alerts into holistic multi-stage kill chains. |
| `/app/incidents/:id` | **Kill-Chain Chronology** | Chronological timeline mapped strictly to MITRE ATT&CK tactics with Markdown report export. |
| `/app/map` | **Geospatial Threat Map** | Interactive Mercator flat projection and 3D orthographic globe with country aggregation and simulated geo tags. |
| `/app/query` | **Ad-hoc Query & Export** | Filterable raw flow telemetry search with CSV and JSON export capabilities. |
| `/app/ingest` | **Ingest & PCAP Replay** | Network stream upload, live replay throttle control, and simulated packet generator. |
| `/app/results` | **Evaluation Benchmark** | Side-by-side Hybrid vs LightGBM benchmark comparison with textual deltas, confusion matrix heat grids, and Novel Suspicious catch metrics. |
| `/app/model` | **Model Health & Drift** | Real-time latency tracking, Wasserstein feature drift metrics, and memory utilization monitors. |
| `/app/registry` | **Model Registry (Admin)** | Versioned model artifact catalog with rollback and canary deployment triggers. |
| `/app/feedback` | **Retraining Candidates** | Curated queue of analyst-committed True/False positive verdicts for future model retraining. |
| `/app/kiosk` | **SOC Booth Kiosk** | Fullscreen auto-cycling display mode for conference demo booths with idle cursor hiding. |
| `/docs` & `/api` | **Documentation & API** | Interactive endpoint explorer, curl generators, and architectural specifications. |
| `/storage` | **Storage Inspector** | Transparency viewer allowing inspection and purging of all client-side `localStorage` keys. |
| `/brand` | **Design System Showcase** | 36+ custom 1.5px SVG glyphs, color tokens, and `ignore.md` compliance guidelines. |

---

## ⌨️ SOC Power Keybindings

| Key | Action |
|---|---|
| `J` / `↓` | Select next alert / incident in list |
| `K` / `↑` | Select previous alert / incident in list |
| `Enter` | Open selected alert detail view |
| `E` | Escalate alert to Tier 2 SOC / Microsoft Teams |
| `R` | Mark alert status as `RESOLVED` |
| `T` | Commit verdict: `TRUE POSITIVE` |
| `F` | Commit verdict: `FALSE POSITIVE` |
| `C` | Copy source IP to clipboard |
| `Ctrl + K` / `Cmd + K` | Open global Command Palette |
| `?` | Toggle Keyboard Shortcuts Cheatsheet |
| `Esc` | Close modals, drawers, or exit Kiosk mode |

*(Shortcuts are automatically suspended while typing inside input fields or textareas).*

---

## 🎨 Design System & Compliance

SignSight strictly adheres to the custom design guidelines specified in `design.md` and `ignore.md`:
- **Tokens Only**: Zero hardcoded hex colors or fonts; all styling consumes CSS custom properties (`var(--bg-0)`, `var(--text)`, `var(--accent)`, `var(--sev-critical)`).
- **Zero Component Libraries**: 100% custom-built UI components and 36+ hand-crafted SVG glyphs with `stroke-width="1.5"` and `stroke-linecap="square"`.
- **Honest Telemetry**: No fabricated metrics or synthetic claims. All client-side groupings carry explicit `DEMO DATA`, `SIMULATED GEO`, or `GROUPED IN THE BROWSER` tags.
- **Accessibility**: Full keyboard navigation, high-contrast colors, WCAG AA compliance, and complete `prefers-reduced-motion` support.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/theturingmachine/signsight-frontend.git
cd signsight-frontend

# Install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` to explore the frontend.

### Production Build
```bash
npm run build
npm run preview
```

---

## 🧪 Guided 90-Second Demo Scenario

Click the **"Run 90s Demo"** button in the top status strip or press `Ctrl+K` and type `demo` to start the automatic scripted walkthrough. The narrator overlay will guide judges through the 5 core value propositions in exactly 90 seconds.

Detailed presentation scripts and fallback timings are available in [`docs/demo-script.md`](file:///c:/Users/thetu/Documents/Study/hackathons/Microsoft%20Innovate%20Frontend/signsight-frontend/docs/demo-script.md).

---

## 📄 License
MIT License. Built for the Microsoft Innovate Hackathon 2026.
