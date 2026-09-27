# Project Brief — Sign-Sight

## Overview

Sign-Sight is an ML-powered network intrusion detection system designed for SOC
(Security Operations Center) teams. It classifies network traffic as normal or one of
four attack categories (DOS, PROBE, R2L, U2R) and surfaces alerts to security analysts
with confidence scores, attack categorization, and evidence for triage.

**It never auto-blocks traffic.** The system recommends; human analysts decide.

## Hackathon Context

- **Event:** Microsoft × Bennett University Hackathon — industry-deployment track.
- **Challenge 26:** "Catch the Attack the Signatures Miss"
- **Judging criteria:** Could Microsoft plausibly deploy this? Not a weekend demo.

## Three Non-Negotiable Requirements (from the challenge brief)

1. **Honest metrics** — precision, recall, false-positive rate, AUC. Not just accuracy.
2. **Class imbalance handling** — documented strategy with tradeoff discussion.
3. **SOC alerting, not auto-blocking** — alerts carry confidence + category + evidence.

## Definition of Done

The project is complete when:

1. A trained model on NSL-KDD produces real, measured metrics (P/R/FPR/AUC).
2. A REST API accepts feature vectors, runs inference, and creates Alert records.
3. Django admin provides a usable SOC dashboard (filter/search/triage alerts).
4. The docker-compose stack (after teammate patches) starts db + backend end-to-end.
5. Tests pass (`pytest`), linting passes (`ruff check`), types pass (`mypy`).
6. Documentation explains every design decision tied to a challenge requirement.

---

## Scope Split

### THRESHOLD — Must-Haves (ship-or-fail)

These are required to meet the challenge's explicit requirements:

| # | Item | Ties to |
|---|---|---|
| T1 | NSL-KDD ingestion + 5-class label mapping | Data pipeline foundation |
| T2 | Feature engineering (encode, scale, no leakage) | Model input |
| T3 | RandomForest with `class_weight="balanced"` | Imbalance handling (req #2) |
| T4 | Evaluation: precision, recall, FPR, AUC per class | Honest metrics (req #1) |
| T5 | Alert model with confidence, category, raw_features | SOC alerting (req #3) |
| T6 | REST API: predict → create alert, list/filter alerts | SOC workflow |
| T7 | Django admin configured as MVP SOC dashboard | Human-in-the-loop (req #3) |
| T8 | No enforcement code paths anywhere | Hard constraint |
| T9 | `analyst_verdict` field (PENDING/TP/FP/ESCALATED) | Analyst triage loop |
| T10 | Model persistence (joblib) + ModelMetadata tracking | Reproducibility |
| T11 | Tests: happy path + error path for each module | Quality bar |
| T12 | docker-compose patch documented for teammate | Deployment path |

### DIFFERENTIATOR — Flex-First (impressive if present, not ship-blocking)

These go beyond the challenge minimum and strengthen the industry-deployment case:

| # | Item | Why it differentiates |
|---|---|---|
| D1 | CICIDS2017 ingestion + unified schema | Shows multi-dataset generalization |
| D2 | UNSW-NB15 ingestion + unified schema | Three-dataset coverage |
| D3 | Model drift monitoring (feature distribution tracking) | Challenge mentions "discuss drift" |
| D4 | SMOTE/resampling comparison vs class_weight | Deeper imbalance analysis |
| D5 | Feature importance visualization endpoint | Analyst explainability |
| D6 | Alert statistics / dashboard API endpoint | SOC operational metrics |
| D7 | Rate limiting + authentication on API | Production hardening |
| D8 | CI/CD pipeline (GitHub Actions) | Deployment maturity |
| D9 | Batch inference endpoint (CSV upload → alerts) | Practical use case |
| D10 | Hyperparameter tuning with cross-validation | Model optimization |

### Explicitly Out of Scope

- Live packet capture / network tap integration
- Real-time streaming inference (Kafka, etc.)
- Frontend SPA / React dashboard (Django admin suffices)
- Auto-blocking, firewall integration, or any enforcement action
- Multi-tenancy or RBAC beyond Django's built-in auth
