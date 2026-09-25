# Sign-Sight 👁️

**ML-powered network intrusion detector for SOC teams.**

Sign-Sight is a network intrusion detection system built around a machine-learning classifier that surfaces anomalous traffic to security analysts. It is based on the **Student Edition challenge: Network Intrusion Detector using ML**.

Unlike a traditional signature-based IDS, Sign-Sight learns what "normal" traffic looks like and flags novel attacks that signatures miss — helping analysts catch threats without drowning in rules.

---

## 🎯 The Challenge

> **Scenario** — You're on the network-security team. The signature-based IDS misses novel attacks, so you need an ML model to surface anomalous traffic to analysts.

> **Solve this** — An ML classifier that labels traffic normal vs. attack (and a few attack types) with honest evaluation, outputting alerts for the SOC — **not auto-blocks**.

Sign-Sight is built around three enterprise-grade requirements:

1. **Honest evaluation** — report precision / recall / false-positive rate / AUC, not just accuracy.
2. **Production readiness** — handle class imbalance and discuss model drift.
3. **Human-in-the-loop** — alert the SOC rather than auto-blocking traffic.

---

## ✨ Features

- **ML-based detection** — labels network flows as *normal* or *attack* (with classification into a few attack types).
- **Honest metrics** — precision, recall, false-positive rate, and AUC reported alongside accuracy.
- **Class-imbalance handling** — techniques to cope with heavily skewed normal-vs-attack distributions.
- **Drift awareness** — discussion and monitoring for model drift over time.
- **SOC-friendly alerts** — outputs alerts for analysts to review; **no automatic blocking**.
- **Alert persistence** — PostgreSQL-backed storage for alert history and analysis (via Docker Compose).

---

## 🏗️ Architecture

Planned pipeline:

```
raw pcap / flow data
      │
      ▼
┌─────────────┐   ┌──────────────────┐   ┌───────────────┐
│ Data ingest │──▶│ Feature engineer │──▶│ Train / eval  │
│ (datasets)  │   │ / preprocess     │   │ (scikit-learn)│
└─────────────┘   └──────────────────┘   └───────┬───────┘
                                                 ▼
┌─────────────┐   ┌──────────────────┐   ┌───────────────┐
│   SOC UI    │◀──│  Alert pipeline  │◀──│    Predict    │
│  / analyst  │   │  (PostgreSQL)    │   │   (inference) │
└─────────────┘   └──────────────────┘   └───────────────┘
```

Design principles:

- **Alert, don't block** — the model never takes enforcement action; it raises alerts for SOC review.
- **Explainable output** — each alert carries context so analysts can triage quickly.
- **Separate concerns** — data ingestion, model training, inference, and alerting are decoupled.

---

## 🗃️ Datasets

Sign-Sight targets standard public intrusion-detection datasets:

| Dataset | Notes |
| --- | --- |
| **NSL-KDD** | Cleaned version of KDD Cup '99; good for benchmarking classifiers. |
| **CICIDS2017** | Modern, realistic traffic captures with a wide range of attack types. |
| **UNSW-NB15** | Modern network traffic with synthetic attack behaviors. |

> ⚠️ Dataset licensing differs per source — check terms before redistribution.

---

## 🧪 Evaluation

Accuracy alone is misleading for intrusion detection (attacks are rare). Sign-Sight reports:

- **Precision** — of flagged alerts, how many are real attacks
- **Recall** — of real attacks, how many were caught
- **False-positive rate (FPR)** — how much noise analysts must triage
- **AUC (ROC)** — overall discrimination ability across thresholds

Additionally:

- **Class imbalance** — evaluated with stratified sampling, class weights, and/or resampling, with the tradeoffs documented.
- **Model drift** — monitored via feature/prediction distributions over time, with a retraining strategy discussed.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Docker (for the alert database)
- scikit-learn and standard data-science tooling

### Setup (planned)

```bash
# 1. Clone the repo
git clone https://github.com/<your-org>/Sign-Sight.git
cd Sign-Sight

# 2. Create a virtualenv and install dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Start the alert database (PostgreSQL)
cp .env.example .env   # set your DB credentials
docker compose up -d

# 4. Run the training pipeline
python -m sign_sight.train --data datasets/nsl-kdd.csv

# 5. Run inference / alert generation
python -m sign_sight.detect --interface eth0 --alert-to db
```

> ⚠️ The codebase is under active development — commands above outline the intended interface.

---

## 📁 Project Structure

```
Sign-Sight/
├── docker-compose.yml       # Alert database (PostgreSQL)
├── .env.example             # Environment template for DB credentials
├── data/                    # Datasets and Postgres data volume
│   └── postgres_data/
├── sign_sight/              # Main package (planned)
│   ├── ingest/              # Dataset ingestion + preprocessing
│   ├── features/            # Feature engineering
│   ├── models/              # Classifier training & evaluation
│   ├── detect/              # Live inference
│   └── alerting/            # SOC alert generation & persistence
└── tests/                   # Unit & integration tests
```

---

## 🗺️ Roadmap

- [ ] Data ingestion for NSL-KDD / CICIDS2017 / UNSW-NB15
- [ ] Baseline Random Forest classifier with full metric reporting
- [ ] Class-imbalance handling and evaluation
- [ ] Drift detection & retraining strategy
- [ ] Live capture → inference → alert pipeline
- [ ] Alert dashboard / API for analysts
- [ ] CI/CD with dataset-based regression testing

---

## 🤝 Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

## 📄 License

To be determined.