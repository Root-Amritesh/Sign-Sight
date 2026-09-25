# Sign-Sight 👁️

**ML-powered network intrusion detector for SOC teams.**

> 📌 **Status: Step 1 scaffolding complete.** Django project, ML pipeline, API, and
> test structure are in place. Next: download NSL-KDD, run migrations, train baseline
> model. See [`memory-bank/activeContext.md`](memory-bank/activeContext.md) for current
> next steps.

Sign-Sight is a network intrusion detection system built around a machine-learning
classifier that surfaces anomalous traffic to security analysts. Unlike a traditional
signature-based IDS, Sign-Sight learns what "normal" traffic looks like and flags novel
attacks that signatures miss — helping analysts catch threats without drowning in rules.

**It never auto-blocks traffic.** The system recommends; human analysts decide.

---

## 🎯 The Challenge

> **Scenario** — You're on the network-security team. The signature-based IDS misses
> novel attacks, so you need an ML model to surface anomalous traffic to analysts.

> **Solve this** — An ML classifier that labels traffic normal vs. attack (and a few
> attack types) with honest evaluation, outputting alerts for the SOC — **not
> auto-blocks**.

Sign-Sight is built around three enterprise-grade requirements:

1. **Honest evaluation** — report precision / recall / false-positive rate / AUC, not
   just accuracy.
2. **Production readiness** — handle class imbalance and discuss model drift.
3. **Human-in-the-loop** — alert the SOC rather than auto-blocking traffic.

---

## ✨ Features

- **ML-based detection** — Random Forest classifier labels network flows as *normal* or
  one of four attack types (DOS, PROBE, R2L, U2R).
- **Honest metrics** — precision, recall, false-positive rate, and AUC reported per
  class.
- **Class-imbalance handling** — `class_weight="balanced"` adjusts weights inversely
  proportional to class frequency.
- **SOC-friendly alerts** — alerts carry confidence, attack category, severity, and the
  raw feature vector for analyst review.
- **No auto-blocking** — the system creates alerts; human analysts decide (escalate,
  block via firewall, or dismiss).
- **Django admin as SOC dashboard** — filter/search/triage alerts with zero frontend
  code.
- **REST API + Swagger UI** — full CRUD on alerts, predict endpoint, OpenAPI docs.
- **Alert persistence** — PostgreSQL-backed storage for alert history and analysis.

---

## 🔄 Pipeline

![NIDS pipeline flowchart](nids_pipeline_flowchart.svg)

```
Network traffic
      │
      ▼
Feature extraction        ←  flow stats, encoding, scaling
      │
      ▼
Random Forest classifier  ←  Normal + 4 attack categories
      │
      ├──▶ Normal traffic  ──▶  Logged, no alert
      │
      └──▶ Attack detected ──▶  SOC alert queue  (confidence + category + evidence)
                                       │
                                       ▼
                              Analyst decision  (escalate, block via firewall, or dismiss)
```

Design principles:

- **Alert, don't block** — the model never takes enforcement action.
- **Explainable output** — each alert carries confidence, category, and evidence.
- **Separate concerns** — data ingestion, model training, inference, and alerting are
  decoupled. The ML pipeline (`sign_sight/`) has zero Django imports.

---

## 🗃️ Datasets

| Dataset | Description | Source |
| --- | --- | --- |
| **NSL-KDD** ⭐ | Cleaned KDD Cup '99; good for benchmarking. **First dataset.** | [unb.ca/cic/datasets/nsl.html](https://www.unb.ca/cic/datasets/nsl.html) |
| **CICIDS2017** | Modern, realistic traffic with wide attack variety. | [unb.ca/cic/datasets/ids-2017.html](https://www.unb.ca/cic/datasets/ids-2017.html) |
| **UNSW-NB15** | Modern network traffic with synthetic attack behaviors. | [researchdata.edu.au/the-unsw-nb15-dataset/1957529](https://researchdata.edu.au/the-unsw-nb15-dataset/1957529) |

> ⚠️ Dataset licensing differs per source — check terms before redistribution.

---

## 🧪 Evaluation

Accuracy alone is misleading for intrusion detection (attacks are rare). Sign-Sight
reports:

- **Precision** — of flagged alerts, how many are real attacks
- **Recall** — of real attacks, how many were caught
- **False-positive rate (FPR)** — how much noise analysts must triage
- **AUC (ROC)** — overall discrimination ability across thresholds

Additionally:

- **Class imbalance** — handled via `class_weight="balanced"` in RandomForest
  (adjusts weights inversely proportional to class frequency).
- **Model drift** — monitored via feature/prediction distributions over time, with a
  retraining strategy documented.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Docker (for PostgreSQL — optional, SQLite works for dev)
- Git

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Root-Amritesh/Sign-Sight.git
cd Sign-Sight

# 2. Create a virtualenv and install dependencies
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements-dev.txt

# 3. Configure environment
cp .env.example .env
# Edit .env: set SECRET_KEY to a random string

# 4. Run migrations
python manage.py migrate

# 5. Create a superuser (for Django admin / SOC dashboard)
python manage.py createsuperuser

# 6. Start the dev server
python manage.py runserver

# 7. Open in browser
# SOC Dashboard: http://localhost:8000/admin/
# API Docs:      http://localhost:8000/api/docs/
# Alert API:     http://localhost:8000/api/v1/alerts/
```

### Download NSL-KDD Dataset

```bash
mkdir -p datasets
# Download KDDTrain+.txt and KDDTest+.txt from:
# https://www.unb.ca/cic/datasets/nsl.html
# Place in datasets/
```

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=sign_sight --cov=alerts --cov-report=term-missing

# Linting
ruff check .
ruff format --check .

# Type checking
mypy sign_sight/ alerts/ config/
```

---

## 📁 Project Structure

```
Sign-Sight/
├── AGENTS.md                     # Agent rules (read by Antigravity/Claude/Cursor)
├── README.md                     # This file
├── manage.py                     # Django management script
├── docker-compose.yml            # PostgreSQL (teammate-owned)
├── nids_pipeline_flowchart.svg   # Pipeline diagram
├── .env.example                  # Environment variable template
├── .gitignore
├── requirements.txt              # Production dependencies
├── requirements-dev.txt          # Dev/test dependencies
├── pyproject.toml                # ruff + pytest config
├── setup.cfg                     # mypy config
│
├── config/                       # Django project configuration
│   ├── settings/
│   │   ├── base.py               # Shared settings (django-environ)
│   │   ├── dev.py                # Development overrides
│   │   └── prod.py               # Production hardening
│   ├── urls.py                   # URL routing
│   ├── wsgi.py                   # WSGI entrypoint
│   └── asgi.py                   # ASGI entrypoint
│
├── alerts/                       # Django app: SOC alerts
│   ├── models.py                 # Alert + ModelMetadata
│   ├── admin.py                  # Django admin = SOC dashboard
│   ├── serializers.py            # DRF serializers
│   ├── views.py                  # API viewsets + predict endpoint
│   ├── inference.py              # ML ↔ Django bridge
│   ├── urls.py                   # DRF router
│   ├── migrations/
│   └── tests/                    # Django app tests
│
├── sign_sight/                   # ML pipeline (Django-free)
│   ├── constants.py              # Label maps, feature lists
│   ├── ingest/                   # Dataset loaders
│   │   └── loader.py             # NSL-KDD loader
│   ├── features/                 # Feature engineering
│   │   └── engineer.py           # Preprocessing pipeline
│   └── models/                   # Training & evaluation
│       └── trainer.py            # Train, evaluate, save/load
│
├── tests/                        # ML pipeline tests
│   ├── conftest.py               # Shared fixtures
│   ├── test_ingest.py
│   ├── test_features.py
│   └── test_trainer.py
│
├── memory-bank/                  # Agent context (git-tracked)
│   ├── projectbrief.md           # PRD + scope
│   ├── techContext.md            # Stack + rationale
│   ├── systemPatterns.md         # Architecture + API contract
│   ├── activeContext.md          # Current focus + next steps
│   └── progress.md               # Done/not-started tracker
│
├── docs/
│   └── agent-toolchain-setup.md  # Multi-agent workflow guide
│
├── datasets/                     # .gitignored — download locally
└── artifacts/                    # .gitignored — trained models
```

---

## 🗺️ Roadmap

- [x] Project scaffolding (Django + ML pipeline + tests)
- [x] Architecture documentation and agent context system
- [ ] NSL-KDD data ingestion + baseline model training
- [ ] Enterprise-grade evaluation (P/R/FPR/AUC per class)
- [ ] Predict API endpoint → Alert creation
- [ ] Django admin SOC dashboard configuration
- [ ] Docker integration (after compose fixes)
- [ ] CICIDS2017 + UNSW-NB15 ingestion (stretch)
- [ ] Drift detection & retraining strategy (stretch)
- [ ] CI/CD pipeline (stretch)

---

## 🤝 Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to
discuss what you'd like to change.

## 📄 License

To be determined.