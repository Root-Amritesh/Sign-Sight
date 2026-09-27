# System Patterns — Sign-Sight

## Architecture Overview

Sign-Sight follows a **layered architecture** with strict separation between the
ML pipeline (Django-free) and the web/API layer (Django + DRF):

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (DRF)                          │
│  /api/v1/alerts/     → AlertViewSet (CRUD + filtering)          │
│  /api/v1/predict/    → predict_view (inference → alert)         │
│  /api/v1/models/     → ModelMetadataViewSet (read-only)         │
│  /api/docs/          → Swagger UI (drf-spectacular)             │
│  /admin/             → Django Admin (MVP SOC Dashboard)          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Django App: alerts                            │
│  models.py    → Alert, ModelMetadata                            │
│  admin.py     → SOC dashboard config                            │
│  serializers  → DRF serializers                                 │
│  views.py     → ViewSets + predict endpoint                     │
│  inference.py → ML ↔ Django bridge (load model, run predict)    │
└─────────────────────────┬───────────────────────────────────────┘
                          │ imports from (no Django dependency)
┌─────────────────────────▼───────────────────────────────────────┐
│                  ML Pipeline: sign_sight/                        │
│  constants.py  → Label maps, column names, feature lists        │
│  ingest/       → Dataset loaders (NSL-KDD, CICIDS, UNSW)       │
│  features/     → Encoding, scaling, feature matrix              │
│  models/       → Train, evaluate, save/load classifiers         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    Data / Storage                                │
│  PostgreSQL   → Alert records, ModelMetadata                    │
│  Filesystem   → artifacts/*.joblib (trained models)             │
│  Filesystem   → datasets/*.txt (NSL-KDD, downloaded locally)   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Architecture Decisions

### 1. ML pipeline is Django-free

**Decision:** `sign_sight/` has zero Django imports. It uses only pandas, numpy,
scikit-learn, and joblib.

**Reasoning:** The ML pipeline must be testable without a Django test database, runnable
as a standalone script (`python -m sign_sight.train`), and importable from the Django
app via `alerts/inference.py`. If we coupled ML code to Django, every ML test would
need database setup, and training scripts would need Django's full startup.

**Consequence:** `alerts/inference.py` acts as the bridge — it imports from `sign_sight`
and creates Django model instances. This is the only file that knows about both worlds.

### 2. Django admin is the MVP SOC dashboard

**Decision:** We don't build a custom frontend. Django admin with `list_display`,
`list_filter`, `search_fields`, and `readonly_fields` IS the SOC dashboard for V1.

**Reasoning:** The challenge requires "alerting the SOC." An analyst needs to:
- See a list of alerts sorted by time
- Filter by severity, attack category, and verdict
- Click into an alert to see raw features (evidence)
- Update the verdict (TRUE_POSITIVE / FALSE_POSITIVE / ESCALATED)

Django admin provides all of this with ~30 lines of configuration. A custom React
frontend would take days and add zero analytical capability.

### 3. No enforcement paths — by design, not by omission

**Decision:** The codebase has no `block()`, no iptables calls, no packet drops.
The only side effect of detecting an attack is creating an Alert record.

**Implementation:** `alerts/inference.py::predict()` returns a dict with
`{category, confidence, is_attack}`. If `is_attack=True`, `alerts/views.py` creates an
Alert with `analyst_verdict="PENDING"`. The analyst later resolves it. No code path
exists that could enforce.

**Enforcement:** This is validated by test — any function containing "block", "drop",
"iptables", "firewall" in a non-comment context should trigger a test failure.

### 4. Predict endpoint creates alerts, not a separate celery task

**Decision:** The `/api/v1/predict/` endpoint synchronously loads the model, runs
inference, and creates an Alert record in the same request.

**Reasoning:** For the hackathon scope, this is sufficient. NSL-KDD inference on a
single feature vector takes <10ms. Celery/Redis would add infra complexity that doesn't
buy anything at this scale. If batch inference becomes a DIFFERENTIATOR goal, we'd add
a bulk endpoint — still synchronous for ≤1000 rows.

### 5. Severity is computed, not predicted

**Decision:** `compute_severity(category, confidence)` is a deterministic function:

| Category | Confidence ≥ 0.9 | Confidence ≥ 0.7 | Confidence ≥ 0.5 | Below 0.5 |
|---|---|---|---|---|
| U2R | CRITICAL | CRITICAL | HIGH | MEDIUM |
| R2L | CRITICAL | HIGH | MEDIUM | LOW |
| DOS | HIGH | HIGH | MEDIUM | LOW |
| PROBE | HIGH | MEDIUM | LOW | LOW |
| NORMAL | — | — | — | — |

**Reasoning:** Severity is an operational concept (how urgently should the analyst look
at this?), not a model output. U2R (privilege escalation) is always higher severity than
PROBE (scanning) at the same confidence level. This mapping is configurable and explicit,
not learned.

---

## API Contract

Base URL: `/api/v1/`

### Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/alerts/` | List alerts (paginated, filterable) | Public (hackathon) |
| POST | `/alerts/` | Create an alert (used by inference bridge) | Public |
| GET | `/alerts/{id}/` | Retrieve a single alert | Public |
| PATCH | `/alerts/{id}/` | Update analyst_verdict + analyst_notes only | Public |
| GET | `/alerts/stats/` | Aggregate counts by category/severity | Public |
| POST | `/predict/` | Submit features → get prediction + create alert | Public |
| GET | `/models/` | List trained model metadata | Public |
| GET | `/models/{id}/` | Retrieve model metadata | Public |
| GET | `/api/schema/` | OpenAPI 3.0 schema (JSON) | Public |
| GET | `/api/docs/` | Swagger UI | Public |
| — | `/admin/` | Django admin (SOC dashboard) | Session auth |

> **Note:** Auth is `AllowAny` for the hackathon. Production would use token auth or
> session auth on all endpoints. This is documented as a DIFFERENTIATOR (D7).

### Predict Request / Response

```json
// POST /api/v1/predict/
// Request:
{
  "features": {
    "duration": 0,
    "protocol_type": "tcp",
    "service": "http",
    "flag": "SF",
    "src_bytes": 215,
    "dst_bytes": 45076,
    "land": 0,
    // ... all 41 NSL-KDD features
  },
  "source_ip": "192.168.1.100",
  "dest_ip": "10.0.0.1",
  "source_port": 52341,
  "dest_port": 80
}

// Response (200):
{
  "prediction": {
    "category": "DOS",
    "confidence": 0.87,
    "is_attack": true,
    "severity": "HIGH"
  },
  "alert_id": 42,
  "alert_url": "/api/v1/alerts/42/"
}

// Response (503 — no active model):
{
  "error": "No active model. Train and register a model first."
}
```

### Alert Filtering

```
GET /api/v1/alerts/?severity=HIGH&attack_category=DOS&analyst_verdict=PENDING
GET /api/v1/alerts/?timestamp_after=2024-01-01T00:00:00Z
GET /api/v1/alerts/?ordering=-confidence
```

---

## Data Flow: Inference Path

```
1. Client POSTs to /api/v1/predict/ with a feature vector + IP metadata.
2. predict_view() in alerts/views.py:
   a. Validates input via serializer.
   b. Calls alerts/inference.py::load_active_model() → gets the current model.
   c. Calls alerts/inference.py::predict(features, model) → {category, confidence}.
   d. Calls alerts/inference.py::compute_severity(category, confidence) → severity.
   e. If is_attack:
      - Creates Alert(category, confidence, severity, raw_features, ...,
                      analyst_verdict="PENDING").
      - Returns prediction + alert_id.
   f. If not attack:
      - Returns prediction only (no alert created for normal traffic).
3. Analyst opens Django admin → sees new alert → triages.
```

---

## Data Flow: Training Path

```
1. Developer runs:  python -m sign_sight.models.trainer (or a management command)
2. sign_sight/ingest/loader.py loads NSL-KDD → DataFrame with 'category' column
3. sign_sight/features/engineer.py transforms → FeatureMatrix (X, y, preprocessor)
4. sign_sight/models/trainer.py trains RandomForest → fitted classifier
5. sign_sight/models/trainer.py evaluates → EvaluationReport (P/R/FPR/AUC)
6. sign_sight/models/trainer.py saves model → artifacts/rf_v1.joblib
7. Developer saves preprocessor alongside: artifacts/preprocessor_v1.joblib
8. Developer creates ModelMetadata in Django admin or via API:
   { version: "v1", dataset: "nsl-kdd", artifact_path: "artifacts/rf_v1.joblib",
     metrics: {...}, is_active: true }
```
