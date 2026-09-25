# Sign-Sight — 20-Stage Master Development Plan

> **FOR CLAUDE SONNET 5 (Medium Thinking)**
>
> You have read `00-project-context.md`. You understand the full project state.
> Below are 20 stages that take Sign-Sight from scaffolding to a fully deployable,
> enterprise-grade NIDS backend that Microsoft could plausibly adopt.
>
> **Your job:** For each stage, generate ONE self-contained prompt that the human
> (Amritesh) will paste into Antigravity IDE. Each prompt must be executable in one
> session (~30-60 min of agent work). Each prompt must start with reading AGENTS.md
> and memory-bank/, and end with updating memory-bank/ and committing.
>
> **DO NOT** hallucinate features, metrics, or code that doesn't exist. Reference
> actual file paths from the repo layout in `00-project-context.md`.

---

## Stage Overview

| # | Stage | Category | What It Produces | Depends On |
|---|---|---|---|---|
| 1 | Environment Bootstrap | Foundation | Working virtualenv, migrations, superuser | Nothing |
| 2 | NSL-KDD Data Pipeline | Data (R1) | Verified data loading, loader tests green | Stage 1 |
| 3 | Feature Engineering Validation | Data (R1) | Validated preprocessor, feature tests green | Stage 2 |
| 4 | Baseline Model Training | ML (R1,R2) | Trained RF model, REAL metrics, saved artifacts | Stage 3 |
| 5 | Inference Engine Wiring | API (R3) | Working predict endpoint with real model | Stage 4 |
| 6 | SOC Dashboard Polish | UI (R3) | Production-quality Django admin for analysts | Stage 5 |
| 7 | Alert Lifecycle API | API (R3) | Full CRUD + filtering + stats on alerts | Stage 6 |
| 8 | Model Registry & Versioning | ML Ops | Multi-model support, version tracking | Stage 7 |
| 9 | CICIDS2017 Integration | Data (R1) | Second dataset loader + unified schema | Stage 8 |
| 10 | UNSW-NB15 Integration | Data (R1) | Third dataset + cross-dataset evaluation | Stage 9 |
| 11 | Imbalance Deep Dive (SMOTE) | ML (R2) | class_weight vs SMOTE comparison with real numbers | Stage 10 |
| 12 | Model Drift Monitoring | ML (R2) | Drift detection module + strategy doc | Stage 11 |
| 13 | Batch Inference API | API | CSV upload → batch predictions → alerts | Stage 12 |
| 14 | Feature Importance & Explainability | ML (R1) | Per-alert and global feature importance | Stage 13 |
| 15 | Comprehensive Test Suite | Quality | 80%+ coverage, integration tests, E2E tests | Stage 14 |
| 16 | API Security & Rate Limiting | Security | Token auth, throttling, CORS, input validation | Stage 15 |
| 17 | Logging, Error Handling & Health | Ops | Structured logging, error middleware, /health | Stage 16 |
| 18 | Docker & Production Config | Deploy | Dockerfile, multi-stage build, gunicorn config | Stage 17 |
| 19 | CI/CD Pipeline | DevOps | GitHub Actions: lint, test, build, publish | Stage 18 |
| 20 | Final Polish & Documentation | Ship | README with real metrics, deployment guide, tag | Stage 19 |

### How stages map to challenge requirements:

- **R1 (Honest metrics):** Stages 2, 3, 4, 9, 10, 14
- **R2 (Class imbalance):** Stages 4, 11, 12
- **R3 (SOC alerting):** Stages 5, 6, 7, 13

---

## Stage 1: Environment Bootstrap & Smoke Test

### Goal
Get from "repo with code files" to "running Django project with database and passing
tests."

### What to do
1. Create Python 3.11 virtualenv at `.venv`
2. Install all dependencies from `requirements-dev.txt`
3. Copy `.env.example` → `.env`, set `SECRET_KEY` to a random string
4. Run `python manage.py makemigrations alerts` to generate the initial migration
5. Run `python manage.py migrate` to create SQLite database
6. Run `python manage.py createsuperuser` (admin / admin@localhost.com / admin)
7. Start dev server: `python manage.py runserver`
8. Verify: `http://localhost:8000/admin/` shows login page
9. Verify: `http://localhost:8000/api/docs/` shows Swagger UI
10. Verify: `http://localhost:8000/api/v1/alerts/` returns empty paginated list
11. Run `pytest` — fix any import errors or test failures
12. Run `ruff check .` — fix any lint issues
13. First commit: all scaffolding + generated migration

### Verification criteria
- `python manage.py runserver` starts without errors
- `/admin/` shows Alert and ModelMetadata in the sidebar
- `/api/docs/` renders Swagger UI with alert endpoints
- `pytest` exits with 0 (or known xfails documented)
- `ruff check .` exits with 0

### Files created/modified
- `.venv/` (not committed)
- `.env` (not committed)
- `db.sqlite3` (not committed)
- `alerts/migrations/0001_initial.py` (committed)
- Fixes to any files that had import issues

### Commit message
`feat: bootstrap environment — migrations, tests, admin verified`

---

## Stage 2: NSL-KDD Data Pipeline

### Goal
Download the dataset, verify the loader works on real data, and ensure the data
pipeline is solid.

### What to do
1. Download `KDDTrain+.txt` and `KDDTest+.txt` from
   https://www.unb.ca/cic/datasets/nsl.html → place in `datasets/`
2. Open Python shell, test the loader:
   ```python
   from sign_sight.ingest import load_nsl_kdd
   train_df = load_nsl_kdd("datasets/KDDTrain+.txt")
   test_df = load_nsl_kdd("datasets/KDDTest+.txt")
   print(f"Train: {train_df.shape}, Test: {test_df.shape}")
   print(train_df["category"].value_counts())
   print(test_df["category"].value_counts())
   ```
3. If the loader breaks (wrong column count, encoding issues), fix
   `sign_sight/ingest/loader.py`
4. Verify: no UNKNOWN categories (all labels map correctly)
5. Update `tests/test_ingest.py` with a test that writes the fixture DataFrame to a
   temp CSV and loads it back through the loader
6. Run `pytest tests/test_ingest.py -v` — all pass
7. Record the actual train/test shapes and class distribution in
   `memory-bank/progress.md`

### Verification criteria
- Train DataFrame shape is approximately (125973, 42) — 41 features + category
- Test DataFrame shape is approximately (22544, 42)
- `category` column has exactly 5 values: NORMAL, DOS, PROBE, R2L, U2R
- No UNKNOWN values
- All tests pass

### Why this matters
If the data pipeline is wrong, every metric downstream is wrong. Garbage in, garbage
out. This stage catches column mismatches, encoding issues, and label mapping bugs
before they propagate.

### What happens if we skip this
Model training will either crash (wrong column count) or silently produce bad results
(wrong label mapping). We'd report fabricated metrics without knowing they're wrong.

### Commit message
`feat: verified NSL-KDD data pipeline with real dataset`

---

## Stage 3: Feature Engineering Validation

### Goal
Verify that the feature engineering pipeline (encode + scale) works correctly on real
NSL-KDD data and doesn't leak training information into test data.

### What to do
1. Load train and test DataFrames from Stage 2
2. Build feature matrices:
   ```python
   from sign_sight.features import build_feature_matrix
   train_fm = build_feature_matrix(train_df, fit=True)
   test_fm = build_feature_matrix(test_df, preprocessor=train_fm.preprocessor, fit=False)
   ```
3. Verify shapes: X has same number of columns for train and test
4. Verify feature names are sensible (numeric names + one-hot encoded names)
5. Verify no NaN or Inf values in X
6. Save the preprocessor for later: `joblib.dump(train_fm.preprocessor, "artifacts/preprocessor_v1.joblib")`
7. Update `tests/test_features.py` to test with real data shapes
8. Handle edge case: if test data has unseen categorical values, `handle_unknown="ignore"`
   in OneHotEncoder should zero them out — verify this works
9. Run `pytest tests/test_features.py -v` — all pass

### Verification criteria
- `train_fm.X.shape` is approximately (125973, N) where N > 41 (one-hot expansion)
- `test_fm.X.shape[1] == train_fm.X.shape[1]` (same feature count)
- No NaN/Inf values
- Preprocessor saved to `artifacts/preprocessor_v1.joblib`
- Tests pass

### Why this matters
Data leakage is the #1 way ML projects report inflated metrics. If we fit the scaler
on train+test combined, the model sees test data statistics during training and the
metrics are lies. This stage ensures fit-on-train, transform-on-test.

### What happens if we skip this
We might have data leakage and report P/R/AUC numbers that are 5-10% higher than
reality. Judges who know ML will catch this immediately.

### Commit message
`feat: validated feature engineering — no data leakage, preprocessor saved`

---

## Stage 4: Baseline Model Training & Real Metrics

### Goal
Train the baseline RandomForest on NSL-KDD, evaluate with enterprise-grade metrics,
and save the model artifact. This is the most important stage — it produces the REAL
numbers that go in the README.

### What to do
1. Create `sign_sight/train.py` — a runnable training script:
   ```python
   """Training script for Sign-Sight baseline model.

   Usage: python -m sign_sight.train --train datasets/KDDTrain+.txt --test datasets/KDDTest+.txt
   """
   ```
   The script should:
   a. Parse args for train/test file paths and output directory
   b. Load datasets via `sign_sight.ingest.load_nsl_kdd`
   c. Build feature matrices via `sign_sight.features.build_feature_matrix`
      (fit on train, transform-only on test)
   d. Train via `sign_sight.models.train_model` (200 trees, balanced, seed=42)
   e. Evaluate via `sign_sight.models.evaluate_model`
   f. Print full EvaluationReport in a readable format:
      - Per-class precision, recall, F1, support
      - Per-class AUC (one-vs-rest)
      - Per-class false-positive rate
      - Macro AUC
      - Confusion matrix
      - Overall accuracy (noted as secondary metric)
   g. Save model to `artifacts/rf_nsl_kdd_v1.joblib`
   h. Save preprocessor to `artifacts/preprocessor_v1.joblib`
   i. Print a summary dict suitable for ModelMetadata.metrics

2. Add `sign_sight/__main__.py` so `python -m sign_sight` runs the training
3. Run: `python -m sign_sight.train --train datasets/KDDTrain+.txt --test datasets/KDDTest+.txt`
4. **CAPTURE THE FULL OUTPUT** — these are the real metrics
5. Paste the real metrics into `memory-bank/progress.md` under "Baseline Model Metrics"
6. Verify: metrics are reasonable (expect ~75-85% accuracy on KDDTest+ — it's harder
   than KDDTrain+ by design, with novel attack types)
7. Create `artifacts/` directory in `.gitignore` (should already be there)
8. Run `pytest tests/test_trainer.py -v` — all pass

### Verification criteria
- `artifacts/rf_nsl_kdd_v1.joblib` exists (file size > 1MB)
- `artifacts/preprocessor_v1.joblib` exists
- EvaluationReport printed with per-class P/R/F1/AUC/FPR
- No NaN values in metrics (except possibly U2R AUC if class is too rare in test set)
- Metrics recorded in progress.md — **REAL NUMBERS, NOT PLACEHOLDERS**
- Tests pass

### Why this matters
This stage produces the core deliverable: a trained model with honest, measured metrics.
The challenge REQUIRES precision, recall, FPR, and AUC — not just accuracy. This is
what judges will look at first.

### What happens if we skip this
We have no model, no metrics, and nothing to show judges. The entire project is a
design doc without this stage.

### Expected output format
```
=== Sign-Sight Baseline Model: NSL-KDD RandomForest ===

Per-class metrics:
           Precision  Recall    F1     AUC    FPR
NORMAL     <real>     <real>   <real>  <real>  <real>
DOS        <real>     <real>   <real>  <real>  <real>
PROBE      <real>     <real>   <real>  <real>  <real>
R2L        <real>     <real>   <real>  <real>  <real>
U2R        <real>     <real>   <real>  <real>  <real>

Macro AUC: <real>
Accuracy:  <real> (secondary metric — see P/R/FPR/AUC above)

Confusion Matrix:
<real 5x5 matrix>

Notes: class_weight='balanced', n_estimators=200, random_state=42
```

### Commit message
`feat: baseline RF model trained on NSL-KDD — real metrics recorded`

---

## Stage 5: Inference Engine Wiring

### Goal
Replace the placeholder inference in `alerts/inference.py` with real model loading and
prediction, so the `/api/v1/predict/` endpoint actually works end-to-end.

### What to do
1. Update `alerts/inference.py`:
   a. `load_model(path)` — already works (joblib.load)
   b. Add `load_preprocessor(path)` — loads the saved ColumnTransformer
   c. Update `predict(features, model)`:
      - Import `build_feature_matrix` from `sign_sight.features`
      - Build a single-row DataFrame from the features dict
      - Transform with the saved preprocessor (fit=False)
      - Call `model.predict(X)` and `model.predict_proba(X)`
      - Return `{category, confidence, is_attack}`
   d. Add a module-level `_model_cache` and `_preprocessor_cache` so we don't reload
      from disk on every request

2. Update `alerts/views.py` `predict_view`:
   a. Load preprocessor alongside model
   b. Pass preprocessor to predict()
   c. Handle errors gracefully (model file missing → 503, bad features → 400)

3. Create `ModelMetadata` via Django shell:
   ```python
   from alerts.models import ModelMetadata
   from django.utils import timezone
   ModelMetadata.objects.create(
       version="rf-nsl-kdd-v1",
       dataset="nsl-kdd",
       trained_at=timezone.now(),
       artifact_path="artifacts/rf_nsl_kdd_v1.joblib",
       metrics={...},  # paste real metrics dict from Stage 4
       is_active=True,
   )
   ```

4. Test end-to-end:
   - Start `python manage.py runserver`
   - POST to `http://localhost:8000/api/v1/predict/` with a real feature vector
     (grab row 0 from KDDTrain+.txt and format as JSON)
   - Verify response has prediction with real category + confidence
   - Verify alert was created (check `/api/v1/alerts/`)
   - Verify alert appears in Django admin

5. Update `alerts/tests/test_views.py` to mock the model and test predict_view

### Verification criteria
- POST to /predict/ with valid features returns 200 with prediction
- POST to /predict/ with no active model returns 503
- Alert record created in database for attack predictions
- Alert visible in Django admin
- Tests pass

### Why this matters
This closes the loop: data → model → API → alert → analyst. Without this, the model
exists but can't be used. This is the "alive demo" moment.

### Commit message
`feat: end-to-end inference — predict API creates real alerts`

---

## Stage 6: SOC Dashboard Polish

### Goal
Make Django admin a genuinely useful SOC dashboard that an analyst would want to use —
not just a raw CRUD interface.

### What to do
1. Enhance `alerts/admin.py` `AlertAdmin`:
   a. Add `date_hierarchy = "timestamp"` for date-based navigation
   b. Add `list_per_page = 25`
   c. Add `readonly_fields` for everything except `analyst_verdict`, `analyst_notes`,
      `resolved_at` (analysts can only change these)
   d. Make `raw_features` display as pretty-printed JSON in detail view
   e. Add custom admin actions:
      - "Mark selected as True Positive"
      - "Mark selected as False Positive"
      - "Escalate selected"
   f. Add `list_editable = ("analyst_verdict",)` so verdicts can be changed from
      the list view without opening each alert
   g. Customize the admin site header: "Sign-Sight SOC Dashboard"
   h. Add fieldsets to organize the detail view:
      - "Network Info" (IPs, ports, protocol)
      - "Detection" (category, confidence, severity, model_version)
      - "Evidence" (raw_features)
      - "Analyst Review" (verdict, notes, resolved_at)

2. Enhance `ModelMetadataAdmin`:
   a. Make `metrics` display as pretty-printed JSON
   b. Add a custom action "Set as Active Model" that deactivates all others
   c. Add `readonly_fields` for everything except `is_active` and `notes`

3. Create a `alerts/management/__init__.py` and
   `alerts/management/commands/__init__.py` and
   `alerts/management/commands/seed_alerts.py`:
   - A management command that creates 50 sample alerts with varied categories,
     severities, and confidence scores for demo purposes
   - `python manage.py seed_alerts`

4. Verify: log into admin, see alerts, filter by severity/category, change a verdict,
   use bulk actions

### Verification criteria
- Admin header says "Sign-Sight SOC Dashboard"
- Alert list shows all key fields at a glance
- Filtering by severity, category, and verdict works
- Bulk actions (mark TP/FP/escalate) work
- Date hierarchy navigation works
- raw_features shows as formatted JSON
- Seed command creates 50 demo alerts

### Why this matters
The challenge says "alert the SOC." Judges will look at this dashboard and ask "could
a real analyst use this?" The answer needs to be yes. Django admin with good config IS
a real analyst tool.

### Commit message
`feat: polished SOC dashboard — admin actions, fieldsets, seed command`

---

## Stage 7: Alert Lifecycle API

### Goal
Make the REST API production-grade with proper filtering, ordering, time-range queries,
and the stats endpoint actually working.

### What to do
1. Create `alerts/filters.py` with a `django-filter` FilterSet:
   ```python
   class AlertFilter(django_filters.FilterSet):
       timestamp_after = django_filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
       timestamp_before = django_filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")
       min_confidence = django_filters.NumberFilter(field_name="confidence", lookup_expr="gte")
       max_confidence = django_filters.NumberFilter(field_name="confidence", lookup_expr="lte")
       class Meta:
           model = Alert
           fields = ["severity", "attack_category", "analyst_verdict", "model_version"]
   ```

2. Update `AlertViewSet`:
   a. Use the AlertFilter as `filterset_class`
   b. Add `ordering_fields = ["timestamp", "confidence", "severity"]`
   c. Add `ordering = ["-timestamp"]` (default)
   d. Fix the `stats` action to also return:
      - Total alert count
      - Alerts by verdict
      - Average confidence
      - Alerts in last 24h / 7d / 30d
   e. Add a `@action(detail=False)` for `export` that returns CSV download
   f. Ensure PATCH only allows `analyst_verdict` + `analyst_notes` + `resolved_at`
   g. Remove DELETE (alerts are immutable audit records)

3. Add a `@action(detail=True, methods=['post'])` for `resolve`:
   - Sets `analyst_verdict` and `resolved_at = timezone.now()`
   - Returns the updated alert

4. Update serializers:
   a. `AlertSerializer` — ensure `raw_features` is read-only
   b. `AlertCreateSerializer` — add validation (confidence between 0-1, valid IP format)
   c. `AlertVerdictSerializer` — add `resolved_at` field

5. Write tests for all new filtering and ordering behavior
6. Verify via Swagger UI: all filters appear, ordering works, stats returns real data

### Verification criteria
- `/api/v1/alerts/?severity=HIGH&attack_category=DOS` returns filtered results
- `/api/v1/alerts/?timestamp_after=2024-01-01T00:00:00Z` works
- `/api/v1/alerts/?ordering=-confidence` sorts by confidence descending
- `/api/v1/alerts/stats/` returns counts, averages, time breakdowns
- `/api/v1/alerts/{id}/resolve/` sets verdict and resolved_at
- DELETE returns 405 Method Not Allowed
- Tests pass

### Commit message
`feat: production-grade alert API — filtering, ordering, stats, export`

---

## Stage 8: Model Registry & Versioning

### Goal
Support multiple trained models with proper version tracking, single-active-model
enforcement, and comparison capabilities.

### What to do
1. Add a `save()` override on `ModelMetadata`:
   - When `is_active=True`, deactivate all other models first
   - Log a warning when switching active models

2. Create `alerts/management/commands/register_model.py`:
   ```
   python manage.py register_model \
     --version rf-nsl-kdd-v1 \
     --dataset nsl-kdd \
     --artifact artifacts/rf_nsl_kdd_v1.joblib \
     --metrics-file artifacts/rf_nsl_kdd_v1_metrics.json \
     --activate
   ```

3. Update the training script (`sign_sight/train.py`):
   - Save metrics as JSON alongside the model artifact
   - Print the Django management command to register the model

4. Add a model comparison endpoint:
   `GET /api/v1/models/compare/?versions=v1,v2` returns side-by-side metrics

5. Add `ModelMetadata` fields:
   - `preprocessor_path` (CharField) — path to the saved preprocessor
   - `feature_count` (IntegerField) — number of features after engineering
   - `training_samples` (IntegerField) — how many rows it trained on
   - `training_duration_seconds` (FloatField) — how long training took

6. Generate and run migration for new fields
7. Update serializers and admin for new fields
8. Tests for single-active enforcement

### Verification criteria
- Only one model can be `is_active=True` at a time
- `register_model` management command works
- Model comparison endpoint returns side-by-side metrics
- Admin shows all model info including training stats
- Tests pass

### Commit message
`feat: model registry with versioning, comparison, and active enforcement`

---

## Stage 9: CICIDS2017 Integration

### Goal
Add the second dataset, proving the pipeline generalizes beyond NSL-KDD.

### What to do
1. Download CICIDS2017 CSVs from https://www.unb.ca/cic/datasets/ids-2017.html
   → place in `datasets/cicids2017/`

2. Create `sign_sight/ingest/cicids_loader.py`:
   - Load the CICIDS2017 CSV files (they have headers)
   - Map CICIDS attack labels to our 5-class schema:
     ```
     BENIGN → NORMAL
     DDoS, DoS Hulk, DoS GoldenEye, DoS Slowhttptest, DoS slowloris → DOS
     PortScan → PROBE
     FTP-Patator, SSH-Patator → R2L
     Web Attack - Brute Force, Web Attack - XSS, Web Attack - SQL Injection → R2L
     Bot, Infiltration, Heartbleed → U2R
     ```
   - Handle the different column names (CICIDS uses "Flow Duration", "Total Fwd Packets",
     etc. vs NSL-KDD's numeric column names)
   - Return DataFrame with same schema as NSL-KDD loader: feature columns + 'category'

3. Create a unified feature engineering approach:
   - Either: map CICIDS columns to equivalent NSL-KDD columns
   - Or: create per-dataset preprocessors
   - Document the decision and tradeoffs

4. Add `sign_sight/ingest/cicids_loader.py` to `sign_sight/ingest/__init__.py`
5. Add tests for the CICIDS loader
6. Train a model on CICIDS and evaluate — compare with NSL-KDD baseline
7. Record metrics in progress.md

### Verification criteria
- CICIDS loader returns DataFrame with 'category' column
- Categories are from LABEL_ORDER (no unknowns for mapped labels)
- Model trains on CICIDS data without errors
- Metrics recorded (real numbers)

### Commit message
`feat: CICIDS2017 ingestion with unified 5-class schema`

---

## Stage 10: UNSW-NB15 Integration & Cross-Dataset Evaluation

### Goal
Add the third dataset and evaluate model performance across all three datasets.

### What to do
1. Download UNSW-NB15 pre-split CSVs from figshare → `datasets/unsw-nb15/`

2. Create `sign_sight/ingest/unsw_loader.py`:
   - Map UNSW-NB15 attack labels:
     ```
     Normal → NORMAL
     DoS, Worms → DOS
     Reconnaissance, Analysis → PROBE
     Exploits, Backdoor, Shellcode → R2L
     Fuzzers, Generic → U2R (or R2L — decide and document)
     ```
   - Handle different column names

3. Create a cross-dataset evaluation script `sign_sight/cross_eval.py`:
   - Train on Dataset A, test on Dataset B
   - 3×3 matrix: train/test on all combinations
   - Report per-dataset and cross-dataset metrics
   - This shows how well the model generalizes (or doesn't)

4. Create `docs/cross-dataset-evaluation.md` documenting:
   - The column mapping decisions
   - The label mapping decisions
   - Cross-dataset performance table (with REAL numbers)
   - What the cross-dataset gaps mean for deployment

5. Tests for UNSW loader

### Verification criteria
- UNSW loader works on real data
- Cross-dataset evaluation runs on all 3×3 combinations
- Results documented with real numbers
- Generalization gaps identified and discussed

### Commit message
`feat: UNSW-NB15 integration + cross-dataset evaluation matrix`

---

## Stage 11: Imbalance Deep Dive — SMOTE Comparison

### Goal
The challenge requires "handle class imbalance." We have `class_weight="balanced"` —
now compare it against SMOTE and document which is better and why.

### What to do
1. Create `sign_sight/models/imbalance.py`:
   ```python
   def train_with_smote(X_train, y_train, *, random_state=42) -> RandomForestClassifier
   def train_with_smote_tomek(X_train, y_train, *, random_state=42) -> RandomForestClassifier
   def compare_strategies(X_train, y_train, X_test, y_test) -> dict[str, EvaluationReport]
   ```

2. Run comparison on NSL-KDD:
   a. Baseline: class_weight="balanced" (already have from Stage 4)
   b. SMOTE: oversample minorities, then train with class_weight=None
   c. SMOTE + Tomek: combined over/undersampling, then train
   d. BorderlineSMOTE: variant that focuses on borderline samples

3. Create `docs/imbalance-analysis.md`:
   - Table comparing all strategies: P/R/F1/AUC per class, especially R2L and U2R
   - Discussion of WHY the winner wins (e.g., SMOTE helps rare classes but may
     create noisy synthetic samples)
   - Recommendation with reasoning
   - Impact on false-positive rate (critical for SOC — too many FPs = alert fatigue)

4. If a strategy beats the baseline, update the active model
5. Tests for imbalance functions
6. Record all numbers in progress.md — REAL, MEASURED

### Verification criteria
- At least 3 strategies compared
- Per-class metrics for each strategy
- R2L and U2R metrics specifically called out (the rare classes)
- Winner identified with reasoning
- FPR impact discussed
- All numbers are REAL

### Why this matters
Judges will specifically ask "how did you handle imbalance?" Saying "we used
class_weight='balanced'" is good. Saying "we compared 4 strategies, here's the data,
here's why we chose X" is excellent.

### Commit message
`feat: imbalance strategy comparison — class_weight vs SMOTE vs Tomek`

---

## Stage 12: Model Drift Monitoring

### Goal
The challenge says "discuss model drift." Build monitoring and document the strategy.

### What to do
1. Create `sign_sight/monitoring/__init__.py` and `sign_sight/monitoring/drift.py`:
   ```python
   @dataclass
   class DriftReport:
       feature_drifts: dict[str, float]  # PSI per feature
       prediction_drift: float  # PSI of predicted class distribution
       is_drifting: bool
       summary: str

   def compute_reference_stats(X_train, feature_names) -> dict
   def detect_drift(X_new, reference_stats, threshold=0.2) -> DriftReport
   def compute_psi(expected, actual, bins=10) -> float
   ```

2. Save reference statistics after training:
   `artifacts/reference_stats_v1.json` — mean, std, quantiles per feature

3. Add drift detection to the predict endpoint (lightweight):
   - On every Nth prediction (e.g., every 100th), compare the feature vector
     against reference stats
   - If drift detected, add a flag to the Alert: `drift_detected=True`
   - Add this field to the Alert model (new migration)

4. Create `GET /api/v1/drift/` endpoint:
   - Returns current drift metrics
   - Based on the last N predictions vs reference stats

5. Create `docs/model-drift-strategy.md`:
   - What drift means for IDS (new attack types, network topology changes,
     software updates changing traffic patterns)
   - How we detect it (PSI on features and predictions)
   - When to retrain (threshold-based triggers)
   - What data to retrain on (sliding window of recent traffic + historical attacks)
   - How to validate the retrained model before promotion

6. Tests for drift functions (use synthetic data with known drift)

### Verification criteria
- `compute_psi()` returns correct values on synthetic data
- Drift detection works: no drift on same-distribution data, drift on shifted data
- Drift endpoint returns metrics
- Strategy doc is comprehensive and specific to IDS (not generic ML)

### Commit message
`feat: model drift detection + retraining strategy doc`

---

## Stage 13: Batch Inference API

### Goal
Allow analysts to upload a CSV of network flows and get batch predictions + alerts.

### What to do
1. Create `alerts/batch.py`:
   ```python
   def process_batch(file_obj, model, preprocessor) -> list[dict]
   ```
   - Reads CSV (with or without headers)
   - Applies feature engineering
   - Runs batch prediction
   - Creates Alert records for attacks
   - Returns list of {row_index, category, confidence, severity, alert_id}

2. Add `POST /api/v1/predict/batch/` endpoint:
   - Accepts multipart/form-data with a CSV file
   - Returns JSON with per-row predictions
   - Creates alerts for attacks
   - Returns summary: total rows, attacks found, alerts created

3. Add file size limits (e.g., 10MB max, 10000 rows max)
4. Add progress tracking for large batches (or just make it synchronous with a
   reasonable timeout)
5. Tests with a small test CSV
6. Update Swagger docs (file upload in drf-spectacular needs specific config)

### Verification criteria
- Upload a 100-row CSV → get 100 predictions back
- Alerts created for attack rows
- Summary stats in response
- File size validation works
- Swagger UI shows file upload field

### Commit message
`feat: batch inference API — CSV upload with bulk alert creation`

---

## Stage 14: Feature Importance & Explainability

### Goal
Give analysts visibility into WHY the model flagged a particular flow. This is the
"evidence" part of the SOC alerting requirement.

### What to do
1. Create `sign_sight/models/explain.py`:
   ```python
   def global_feature_importance(clf, feature_names) -> dict[str, float]
   def local_feature_importance(clf, X_single, feature_names) -> dict[str, float]
   ```
   - Global: RandomForest's `feature_importances_` attribute
   - Local: per-sample contribution (use permutation importance or tree-based
     feature contribution)

2. Add feature importance to Alert records:
   - When creating an alert in predict_view, compute local feature importance
   - Store in `raw_features` or a new `feature_importance` JSONField
   - This tells the analyst "these features drove the detection"

3. Add `GET /api/v1/features/importance/` endpoint:
   - Returns global feature importance (top 20 features)
   - Optionally filter by model version

4. Add `GET /api/v1/alerts/{id}/explain/` endpoint:
   - Returns the local feature importance for that specific alert
   - "Why was this flagged?" answer

5. Update Django admin to show feature importance in alert detail view
6. Tests for importance functions

### Verification criteria
- Global importance returns sorted feature names with scores summing to ~1.0
- Local importance returns per-feature contributions for a single alert
- Explain endpoint works for existing alerts
- Admin shows importance data

### Commit message
`feat: feature importance + per-alert explainability for SOC analysts`

---

## Stage 15: Comprehensive Test Suite

### Goal
Get test coverage to 80%+ across the entire codebase. Add integration tests and
edge case tests.

### What to do
1. Create `alerts/tests/factories.py` using factory-boy:
   ```python
   class AlertFactory(factory.django.DjangoModelFactory):
       class Meta:
           model = Alert
       source_ip = factory.Faker("ipv4")
       dest_ip = factory.Faker("ipv4")
       ...

   class ModelMetadataFactory(factory.django.DjangoModelFactory):
       ...
   ```

2. Add integration tests:
   - Full predict flow: POST features → alert created → appears in list → update verdict
   - Batch predict: upload CSV → alerts created → stats updated
   - Model switch: register new model → set active → predict uses new model

3. Add edge case tests:
   - Predict with missing features → 400
   - Predict with invalid IP → 400
   - Predict with no active model → 503
   - Alert with confidence out of range → validation error
   - Filter with invalid date format → 400
   - Concurrent model activation (race condition)

4. Add parametrized tests for severity computation:
   ```python
   @pytest.mark.parametrize("category,confidence,expected", [
       ("U2R", 0.95, "CRITICAL"),
       ("PROBE", 0.3, "LOW"),
       ...
   ])
   def test_compute_severity(category, confidence, expected):
       assert compute_severity(category, confidence) == expected
   ```

5. Run `pytest --cov=sign_sight --cov=alerts --cov-report=term-missing`
6. Identify uncovered lines and add tests
7. Target: 80%+ on sign_sight/, 70%+ on alerts/

### Verification criteria
- Coverage > 80% on sign_sight/
- Coverage > 70% on alerts/
- All edge cases tested
- Factory-boy factories work
- Integration tests pass end-to-end
- `pytest` exits with 0

### Commit message
`test: comprehensive test suite — 80%+ coverage, integration tests, edge cases`

---

## Stage 16: API Security & Rate Limiting

### Goal
Add authentication, rate limiting, and CORS — making the API production-safe.

### What to do
1. Add `djangorestframework-simplejwt` to requirements.txt
2. Add `django-cors-headers` to requirements.txt
3. Configure JWT auth in settings:
   - Token-based authentication for API endpoints
   - Session auth still works for Django admin
   - `/api/v1/predict/` requires authentication
   - `/api/docs/` and `/api/schema/` remain public

4. Add DRF throttling:
   ```python
   REST_FRAMEWORK = {
       'DEFAULT_THROTTLE_CLASSES': [
           'rest_framework.throttling.AnonRateThrottle',
           'rest_framework.throttling.UserRateThrottle',
       ],
       'DEFAULT_THROTTLE_RATES': {
           'anon': '20/hour',
           'user': '1000/hour',
           'predict': '100/minute',  # custom scope for predict endpoint
       },
   }
   ```

5. Configure CORS:
   ```python
   CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[
       "http://localhost:3000",
       "http://localhost:8000",
   ])
   ```

6. Add input validation middleware:
   - Reject payloads > 1MB
   - Validate Content-Type headers
   - Sanitize string inputs

7. Add `SECURE_*` flags in prod settings (already partially done)
8. Add `/api/v1/auth/token/` and `/api/v1/auth/token/refresh/` endpoints
9. Update Swagger docs with auth configuration
10. Tests for auth + rate limiting

### Verification criteria
- Unauthenticated requests to /predict/ return 401
- Token auth works: get token → use in header → request succeeds
- Rate limiting kicks in after threshold
- CORS headers present in responses
- Swagger shows auth options
- Admin login still works with session auth

### Commit message
`feat: API security — JWT auth, rate limiting, CORS, input validation`

---

## Stage 17: Logging, Error Handling & Health Check

### Goal
Add production-grade observability: structured logging, proper error responses, and a
health check endpoint.

### What to do
1. Configure Django logging in `config/settings/base.py`:
   ```python
   LOGGING = {
       "version": 1,
       "disable_existing_loggers": False,
       "formatters": {
           "verbose": {
               "format": "{asctime} {levelname} {name} {message}",
               "style": "{",
           },
           "json": {
               "()": "sign_sight.logging.JSONFormatter",
           },
       },
       "handlers": {
           "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
           "file": {
               "class": "logging.handlers.RotatingFileHandler",
               "filename": BASE_DIR / "logs" / "sign_sight.log",
               "maxBytes": 10_000_000,
               "backupCount": 5,
               "formatter": "json",
           },
       },
       "loggers": {
           "alerts": {"handlers": ["console", "file"], "level": "INFO"},
           "sign_sight": {"handlers": ["console", "file"], "level": "INFO"},
           "django": {"handlers": ["console"], "level": "WARNING"},
       },
   }
   ```

2. Create `sign_sight/logging.py` with a JSON formatter

3. Add logging to key code paths:
   - Prediction made (INFO): category, confidence, alert_id
   - Model loaded (INFO): version, path
   - Drift detected (WARNING): feature, psi_value
   - Error in prediction (ERROR): exception, features

4. Create error handling middleware `config/middleware.py`:
   ```python
   class SignSightExceptionMiddleware:
       """Catches unhandled exceptions and returns structured JSON errors."""
   ```

5. Add `GET /api/v1/health/` endpoint:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "active_model": "rf-nsl-kdd-v1",
     "model_loaded": true,
     "total_alerts": 1234,
     "uptime_seconds": 3600
   }
   ```
   Returns 503 if database is down or no active model.

6. Create `logs/` directory, add to `.gitignore`
7. Replace any remaining `print()` calls with `logger.info()` / `logger.warning()`
8. Tests for health endpoint and error middleware

### Verification criteria
- Health endpoint returns 200 with status details
- Health endpoint returns 503 when database is down
- Structured JSON logs appear in `logs/sign_sight.log`
- All print() calls removed from production code
- Error middleware returns JSON for unhandled exceptions
- Tests pass

### Commit message
`feat: structured logging, error middleware, health check endpoint`

---

## Stage 18: Docker & Production Configuration

### Goal
Create a proper Dockerfile and production configuration so the project is deployable.

### What to do
1. Create `Dockerfile`:
   ```dockerfile
   FROM python:3.11-slim AS base
   ENV PYTHONDONTWRITEBYTECODE=1 \
       PYTHONUNBUFFERED=1
   WORKDIR /app

   FROM base AS builder
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   FROM base AS production
   COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
   COPY --from=builder /usr/local/bin /usr/local/bin
   COPY . .
   RUN python manage.py collectstatic --noinput
   EXPOSE 8000
   CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
   ```

2. Create `.dockerignore`:
   ```
   .venv/
   .git/
   .env
   __pycache__/
   *.pyc
   datasets/
   artifacts/
   logs/
   db.sqlite3
   .mypy_cache/
   .pytest_cache/
   .ruff_cache/
   ```

3. Create `config/gunicorn.conf.py`:
   ```python
   bind = "0.0.0.0:8000"
   workers = 4
   worker_class = "gthread"
   threads = 2
   timeout = 120
   accesslog = "-"
   errorlog = "-"
   loglevel = "info"
   ```

4. Update `config/settings/prod.py`:
   - STATIC_ROOT configured for collectstatic
   - ALLOWED_HOSTS from env (required)
   - Database from env (required, no SQLite fallback)
   - Security headers

5. Document in progress.md the exact docker-compose patches needed for the teammate
   (updated from earlier — now includes the Dockerfile reference)

6. Create `scripts/docker-entrypoint.sh`:
   ```bash
   #!/bin/bash
   set -e
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   exec "$@"
   ```

7. Test: `docker build -t sign-sight .` — verify it builds
8. Test: `docker run -p 8000:8000 sign-sight` — verify it starts (will fail on DB
   without PostgreSQL, but gunicorn should start)

### Verification criteria
- `docker build` succeeds
- Image size is reasonable (< 500MB)
- Multi-stage build works
- Static files collected
- Gunicorn config is production-appropriate
- .dockerignore excludes large files

### Commit message
`feat: Docker production config — multi-stage build, gunicorn, entrypoint`

---

## Stage 19: CI/CD Pipeline

### Goal
Automated quality gates: lint, type-check, test, build on every push.

### What to do
1. Create `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     lint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with: { python-version: "3.11" }
         - run: pip install ruff
         - run: ruff check .
         - run: ruff format --check .

     type-check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with: { python-version: "3.11" }
         - run: pip install -r requirements-dev.txt
         - run: mypy sign_sight/ alerts/ config/ --ignore-missing-imports

     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with: { python-version: "3.11" }
         - run: pip install -r requirements-dev.txt
         - run: pytest --cov=sign_sight --cov=alerts --cov-report=xml
         - uses: codecov/codecov-action@v4 # optional

     build:
       runs-on: ubuntu-latest
       needs: [lint, type-check, test]
       steps:
         - uses: actions/checkout@v4
         - run: docker build -t sign-sight .
   ```

2. Create `.github/workflows/release.yml`:
   - Triggered on tag push (v*)
   - Builds Docker image
   - Pushes to GitHub Container Registry (ghcr.io)

3. Create `.pre-commit-config.yaml`:
   ```yaml
   repos:
     - repo: https://github.com/astral-sh/ruff-pre-commit
       rev: v0.8.0
       hooks:
         - id: ruff
           args: [--fix]
         - id: ruff-format
     - repo: https://github.com/pre-commit/pre-commit-hooks
       rev: v4.6.0
       hooks:
         - id: trailing-whitespace
         - id: end-of-file-fixer
         - id: check-yaml
         - id: check-added-large-files
           args: ['--maxkb=1000']
   ```

4. Run `pre-commit install` to set up git hooks
5. Run `pre-commit run --all-files` to verify everything passes
6. Add CI badge to README.md

### Verification criteria
- GitHub Actions workflow file is valid YAML
- Pre-commit hooks run on commit
- All checks pass locally (lint, type, test)
- CI badge renders in README

### Commit message
`ci: GitHub Actions pipeline — lint, type-check, test, build`

---

## Stage 20: Final Polish & Documentation

### Goal
Ship it. Everything is clean, documented, and tagged.

### What to do
1. Update `README.md`:
   - Add CI badge
   - Add "Baseline Results" section with REAL metrics table
   - Add "API Quick Reference" with all endpoints
   - Add example curl commands for key endpoints
   - Add "Architecture" section with data flow diagram
   - Add "Imbalance Strategy" summary
   - Add "Model Drift" summary
   - Update roadmap with completed items checked
   - Add "Deployment" section pointing to Docker instructions

2. Update all memory-bank files to final state:
   - `projectbrief.md` — mark all THRESHOLD items as DONE
   - `techContext.md` — final stack list with any additions
   - `systemPatterns.md` — final architecture with all endpoints
   - `activeContext.md` — mark as "v1.0 shipped"
   - `progress.md` — all items checked, all metrics recorded

3. Run final quality checks:
   ```
   ruff check .
   ruff format --check .
   mypy sign_sight/ alerts/ config/
   pytest --cov=sign_sight --cov=alerts --cov-report=term-missing
   python manage.py check --deploy
   docker build -t sign-sight .
   ```
   ALL must pass.

4. Create `CHANGELOG.md`:
   ```markdown
   # Changelog
   ## v1.0.0 — Initial Release
   - NSL-KDD / CICIDS2017 / UNSW-NB15 data pipelines
   - RandomForest classifier with balanced class weights
   - Enterprise evaluation: P/R/FPR/AUC per class
   - REST API with predict, batch predict, alerts CRUD
   - Django admin SOC dashboard
   - Model registry with versioning
   - Feature importance and explainability
   - Model drift monitoring
   - JWT authentication + rate limiting
   - Docker production deployment
   - CI/CD with GitHub Actions
   ```

5. Final commit and tag:
   ```bash
   git add -A
   git commit -m "docs: v1.0.0 — final polish, real metrics, deployment guide"
   git tag v1.0.0
   git push origin main --tags
   ```

### Verification criteria
- README has real metrics (no TBD or placeholders)
- All quality checks pass
- Docker builds successfully
- All memory-bank files are current
- CHANGELOG exists
- v1.0.0 tag created

### Commit message
`docs: v1.0.0 — final polish, real metrics, deployment guide`

---

## Summary: What This Produces

After all 20 stages, Sign-Sight has:

| Capability | Files | Challenge Requirement |
|---|---|---|
| 3 dataset pipelines (NSL-KDD, CICIDS, UNSW) | sign_sight/ingest/ | Data foundation |
| Feature engineering with no data leakage | sign_sight/features/ | R1 (honest metrics) |
| Trained model with REAL P/R/FPR/AUC metrics | sign_sight/models/ + artifacts/ | R1 (honest metrics) |
| Imbalance comparison (4 strategies, real numbers) | sign_sight/models/imbalance.py | R2 (class imbalance) |
| Model drift monitoring + strategy doc | sign_sight/monitoring/ + docs/ | R2 (model drift) |
| Predict API → Alert record (NO blocking) | alerts/views.py, inference.py | R3 (SOC alerting) |
| Django admin SOC dashboard | alerts/admin.py | R3 (SOC alerting) |
| Batch inference API | alerts/batch.py | Production utility |
| Feature importance + per-alert explainability | sign_sight/models/explain.py | Analyst evidence |
| Model registry + versioning | alerts/models.py, management/ | ML Ops |
| JWT auth + rate limiting + CORS | config/settings/ | Security |
| Structured logging + health check | config/logging, alerts/health | Operations |
| Docker multi-stage build | Dockerfile | Deployment |
| CI/CD pipeline | .github/workflows/ | DevOps |
| 80%+ test coverage | tests/, alerts/tests/ | Quality |
| Comprehensive documentation | README, docs/, memory-bank/ | Judging |

**This is a codebase that Microsoft could plausibly deploy.** Not a weekend demo.

---

## Instructions for Claude Sonnet 5

Now generate 20 prompts — one per stage. Each prompt should be:

1. **Self-contained** — starts with "Read AGENTS.md first"
2. **Specific** — references exact file paths, function names, class names
3. **Verifiable** — ends with "verify by running X and seeing Y"
4. **Committing** — ends with updating memory-bank + git commit
5. **Sized for one session** — 30-60 min of Antigravity agent work
6. **Non-hallucinating** — uses `<TBD>` for metrics, never fabricates numbers
7. **Respectful of ownership** — never touches docker-compose.yml

Format each prompt in a fenced code block so the human can copy-paste directly.
