# Sign-Sight — Complete Project Context for Claude Sonnet 5

> **PURPOSE OF THIS DOCUMENT:** You (Claude Sonnet 5, medium thinking) will read this
> file to fully understand the Sign-Sight project before generating stage-by-stage
> prompts for the human to paste into Antigravity IDE. This document is your single
> source of truth. DO NOT hallucinate features, metrics, or capabilities that don't
> exist yet. If something is marked "NOT BUILT YET" — it is not built.

---

## Table of Contents

1. [Who You Are and What You're Doing](#1-who-you-are-and-what-youre-doing)
2. [The Project — What Is Sign-Sight](#2-the-project--what-is-sign-sight)
3. [The Hackathon & Challenge](#3-the-hackathon--challenge)
4. [Three Non-Negotiable Requirements](#4-three-non-negotiable-requirements)
5. [What Exists Right Now (Exact Codebase State)](#5-what-exists-right-now)
6. [What Does NOT Exist Yet](#6-what-does-not-exist-yet)
7. [Full Tech Stack With Rationale](#7-full-tech-stack-with-rationale)
8. [Repository Layout](#8-repository-layout)
9. [Key Architecture Decisions Already Made](#9-key-architecture-decisions-already-made)
10. [The Docker-Compose Problem](#10-the-docker-compose-problem)
11. [Existing Code — Key Files Explained](#11-existing-code--key-files-explained)
12. [The Memory Bank System](#12-the-memory-bank-system)
13. [Agent Toolchain & Account-Switching](#13-agent-toolchain--account-switching)
14. [MCP Servers, Plugins, Extensions & Skills](#14-mcp-servers-plugins-extensions--skills)
15. [Rules for Generating Prompts](#15-rules-for-generating-prompts)
16. [Known Pitfalls & Anti-Patterns](#16-known-pitfalls--anti-patterns)
17. [Datasets — Detailed Technical Notes](#17-datasets--detailed-technical-notes)
18. [API Contract (Target State)](#18-api-contract-target-state)
19. [Quality Bar](#19-quality-bar)
20. [Ownership Boundaries](#20-ownership-boundaries)

---

## 1. Who You Are and What You're Doing

You are Claude Sonnet 5 (medium thinking). The human (Amritesh) is going to give you
the companion document `01-twenty-stage-master-plan.md` which contains 20 development
stages. Your job is to:

1. **Understand this context file completely.**
2. **Read the 20-stage plan.**
3. **Generate one prompt per stage** that Amritesh will copy-paste into
   **Antigravity IDE** (Google's AI coding agent, similar to Cursor or Claude Code).
4. Each prompt must be **self-contained** — Antigravity may be running on a different
   Google account (quota-hopping), so it has no memory of previous sessions.
5. Each prompt must reference `AGENTS.md` and `memory-bank/` so Antigravity picks up
   context from the repo, not from session history.

**You are NOT writing the code.** You are writing prompts that Antigravity will execute.

---

## 2. The Project — What Is Sign-Sight

**Sign-Sight** is an ML-powered Network Intrusion Detection System (NIDS) for Security
Operations Center (SOC) teams.

**What it does:**
- Takes network traffic features (flow stats like duration, bytes, ports, protocol)
- Classifies them as NORMAL or one of 4 attack types: DOS, PROBE, R2L, U2R
- Creates an **alert record** with confidence score, severity, and raw evidence
- Presents alerts to human analysts via Django Admin (the SOC dashboard)
- Analysts triage: TRUE_POSITIVE, FALSE_POSITIVE, or ESCALATED
- **It NEVER auto-blocks traffic. Never. This is a hard rule.**

**What it is NOT:**
- Not a packet sniffer (it classifies pre-extracted features, not raw packets)
- Not a firewall (it creates alerts, not blocks)
- Not a real-time streaming system (batch/request-based, not Kafka)
- Not a frontend project (Django Admin IS the dashboard)

---

## 3. The Hackathon & Challenge

- **Event:** Microsoft × Bennett University Hackathon
- **Track:** Industry-deployment (judged as "could Microsoft deploy this?")
- **Challenge 26:** "Catch the Attack the Signatures Miss"

**Challenge text (verbatim):**
> Scenario — You're on the network-security team. The signature-based IDS misses novel
> attacks, so you need an ML model to surface anomalous traffic to analysts.
>
> Solve this — An ML classifier that labels traffic normal vs attack (and a few attack
> types) with honest evaluation, outputting alerts for the SOC — not auto-blocks.
>
> Data & free tools — NSL-KDD / CICIDS2017 / UNSW-NB15 datasets; scikit-learn (e.g.
> Random Forest).
>
> Make it enterprise-grade:
> - Report precision / recall / false-positive rate / AUC — not just accuracy.
> - Handle class imbalance and discuss model drift.
> - Alert the SOC rather than auto-blocking traffic.

---

## 4. Three Non-Negotiable Requirements

These come directly from the challenge. Every stage must respect them:

| # | Requirement | What it means concretely |
|---|---|---|
| **R1** | Honest metrics | Report P/R/FPR/AUC per class. Never fabricate a number. If code hasn't run, use `<TBD>`. |
| **R2** | Handle class imbalance | Use `class_weight="balanced"` at minimum. Compare with SMOTE. Document tradeoffs. |
| **R3** | SOC alerting, not auto-blocking | No `block()`, no iptables, no firewall calls, no packet drops. Only Alert records. |

**Additional hard rules:**
- No fabricated metrics ANYWHERE (docs, README, comments, slides)
- Type hints on all functions
- Tests for every module
- ruff + mypy clean from day one

---

## 5. What Exists Right Now

The repo is at `D:\07_Development\Sign-Sight`. As of right now, the following exists
as **scaffolding** (structure is complete, some files need refinement during stages):

### Files that exist (50 total):

**Root:**
- `AGENTS.md` — repo constitution for all AI agents
- `README.md` — project overview (updated for Django layout)
- `manage.py` — Django management script
- `docker-compose.yml` — teammate's file (has bugs, DO NOT EDIT)
- `nids_pipeline_flowchart.svg` — pipeline diagram
- `.env.example` — canonical env vars
- `.gitignore` — comprehensive Python/Django/ML gitignore
- `requirements.txt` — production dependencies
- `requirements-dev.txt` — dev dependencies
- `pyproject.toml` — ruff + pytest config
- `setup.cfg` — mypy config

**config/ (Django project):**
- `config/__init__.py`
- `config/settings/__init__.py`
- `config/settings/base.py` — shared settings (django-environ, DRF, drf-spectacular)
- `config/settings/dev.py` — SQLite, DEBUG=True
- `config/settings/prod.py` — security hardening
- `config/urls.py` — admin + API v1 + schema + swagger
- `config/wsgi.py`
- `config/asgi.py`

**alerts/ (Django app):**
- `alerts/__init__.py`
- `alerts/apps.py` — AlertsConfig
- `alerts/models.py` — Alert + ModelMetadata models (complete, 83 lines)
- `alerts/admin.py` — Django admin registration (basic, needs polish)
- `alerts/serializers.py` — 4 DRF serializers (complete)
- `alerts/views.py` — AlertViewSet + ModelMetadataViewSet + predict_view (complete)
- `alerts/inference.py` — ML↔Django bridge (severity matrix complete, predict is placeholder)
- `alerts/urls.py` — DRF router
- `alerts/migrations/__init__.py` (no migrations generated yet!)
- `alerts/tests/__init__.py`
- `alerts/tests/test_models.py`
- `alerts/tests/test_views.py`
- `alerts/tests/test_serializers.py`

**sign_sight/ (ML pipeline — Django-free):**
- `sign_sight/__init__.py` — `__version__ = "0.1.0"`
- `sign_sight/constants.py` — NSL-KDD label map (39→5), column names, feature lists
- `sign_sight/ingest/__init__.py` — re-exports `load_nsl_kdd`
- `sign_sight/ingest/loader.py` — NSL-KDD loader (complete, ~60 lines)
- `sign_sight/features/__init__.py` — re-exports `build_feature_matrix`
- `sign_sight/features/engineer.py` — ColumnTransformer pipeline (complete, ~90 lines)
- `sign_sight/models/__init__.py` — re-exports `train_model`, `evaluate_model`
- `sign_sight/models/trainer.py` — train/evaluate/save/load (complete, 179 lines)

**tests/ (ML pipeline tests):**
- `tests/__init__.py`
- `tests/conftest.py` — shared fixtures (synthetic NSL-KDD DataFrame)
- `tests/test_ingest.py`
- `tests/test_features.py`
- `tests/test_trainer.py`

**memory-bank/ (agent context persistence):**
- `memory-bank/projectbrief.md` — PRD + THRESHOLD/DIFFERENTIATOR split
- `memory-bank/techContext.md` — stack, datasets, env vars, setup guide
- `memory-bank/systemPatterns.md` — architecture, API contract, data flow
- `memory-bank/activeContext.md` — current focus + next steps
- `memory-bank/progress.md` — done/not-started + docker-compose patches

**docs/:**
- `docs/agent-toolchain-setup.md` — MCP, subagents, fallbacks, bootstrap prompt

### What has NOT been done yet (critical):
- `python manage.py migrate` has NOT been run (no database exists)
- No virtualenv has been created
- No dependencies have been installed
- No tests have been run
- No model has been trained
- No real metrics exist
- The predict endpoint uses a placeholder inference function
- docker-compose.yml has not been fixed (teammate's job)
- No NSL-KDD data has been downloaded

---

## 6. What Does NOT Exist Yet

These are things that WILL be built across the 20 stages:

- No virtualenv / installed dependencies
- No generated migrations
- No database (SQLite or PostgreSQL)
- No superuser
- No trained model or artifacts
- No `sign_sight/train.py` training script
- No CICIDS2017 loader
- No UNSW-NB15 loader
- No unified schema across datasets
- No model drift monitoring
- No batch inference endpoint
- No feature importance/explainability
- No API authentication or rate limiting
- No management commands
- No logging configuration
- No Dockerfile
- No CI/CD pipeline
- No health check endpoint
- No pre-commit hooks configured
- No `.pre-commit-config.yaml`
- No comprehensive test coverage
- No CORS configuration
- No SMOTE comparison
- No error handling middleware
- No request/response logging

---

## 7. Full Tech Stack With Rationale

| Component | Choice | Version | Why |
|---|---|---|---|
| Language | Python | 3.11 | Team standard, ML ecosystem compat |
| Web framework | Django + DRF | 5.1.x + 3.15.x | Admin = SOC dashboard, ORM migrations, browsable API |
| ML | scikit-learn | 1.5.x | Challenge-specified, RandomForest baseline |
| Database | PostgreSQL (prod) / SQLite (dev) | 16+ / built-in | Alert persistence, JSON fields |
| Imbalance | imbalanced-learn | 0.12.x | SMOTE comparison (DIFFERENTIATOR) |
| API docs | drf-spectacular | 0.28.x | OpenAPI 3.0 from serializers |
| Filtering | django-filter | 24.x | Declarative queryset filtering |
| Config | django-environ | 0.12.x | 12-factor env vars |
| DB adapter | psycopg 3 | 3.2.x | Modern async-ready PostgreSQL adapter |
| Server | gunicorn | 22.x | Production WSGI |
| Model serialization | joblib | 1.4.x | scikit-learn recommended |
| Data | pandas + numpy | 2.2.x + 1.26.x | Dataset loading, feature engineering |
| Testing | pytest + pytest-django | 8.x + 4.9.x | Fixtures, parametrize, Django integration |
| Test data | factory-boy | 3.3.x | Django model factories |
| Linting | ruff | 0.8.x | Replaces flake8+black+isort |
| Types | mypy + django-stubs + drf-stubs | 1.13.x | Static type checking |
| Git hooks | pre-commit | 4.x | Automated quality gates |

**Why Django over FastAPI (confirmed, do not re-litigate):**
1. Django admin gives a filterable/searchable/editable alert dashboard with ~30 lines
   of config. This IS the SOC dashboard requirement. FastAPI has no admin.
2. Django ORM + migrations = versioned schema changes. No manual SQL.
3. DRF browsable API = judges can explore the API in a browser.
4. Django's built-in auth = admin login with zero extra work.

---

## 8. Repository Layout

```
D:\07_Development\Sign-Sight\
├── AGENTS.md
├── README.md
├── manage.py
├── docker-compose.yml          ← TEAMMATE'S FILE, DO NOT EDIT
├── nids_pipeline_flowchart.svg
├── .env.example
├── .gitignore
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml
├── setup.cfg
│
├── config/                     ← Django project config
│   ├── __init__.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py
│       ├── dev.py
│       └── prod.py
│
├── alerts/                     ← Django app (SOC alerts)
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py               ← Alert + ModelMetadata
│   ├── admin.py                ← SOC dashboard config
│   ├── serializers.py          ← DRF serializers
│   ├── views.py                ← ViewSets + predict
│   ├── inference.py            ← ML ↔ Django bridge
│   ├── urls.py
│   ├── migrations/
│   └── tests/
│       ├── test_models.py
│       ├── test_views.py
│       └── test_serializers.py
│
├── sign_sight/                 ← ML pipeline (Django-free)
│   ├── __init__.py
│   ├── constants.py
│   ├── ingest/
│   │   └── loader.py
│   ├── features/
│   │   └── engineer.py
│   └── models/
│       └── trainer.py
│
├── tests/                      ← ML pipeline tests
│   ├── conftest.py
│   ├── test_ingest.py
│   ├── test_features.py
│   └── test_trainer.py
│
├── memory-bank/                ← Agent context persistence
│   ├── projectbrief.md
│   ├── techContext.md
│   ├── systemPatterns.md
│   ├── activeContext.md
│   └── progress.md
│
├── docs/
│   └── agent-toolchain-setup.md
│
├── send to claude/             ← THIS FOLDER (your instructions)
│
├── datasets/                   ← .gitignored, download locally
└── artifacts/                  ← .gitignored, trained models
```

---

## 9. Key Architecture Decisions Already Made

These are FINAL. Do not re-litigate or propose alternatives in prompts.

### Decision 1: ML pipeline is Django-free
`sign_sight/` has ZERO Django imports. It uses only pandas, numpy, scikit-learn, joblib.
`alerts/inference.py` is the bridge between the two worlds.

### Decision 2: Django admin IS the SOC dashboard
No custom frontend. `alerts/admin.py` with `list_display`, `list_filter`,
`search_fields`, `readonly_fields`. Analysts triage here.

### Decision 3: No enforcement code paths
No `block()`, iptables, firewall, packet drops. Attack detection → Alert record.
Analyst decides. This is a HARD RULE tested by code review.

### Decision 4: Synchronous predict endpoint
`/api/v1/predict/` loads model, runs inference, creates Alert in one request.
No Celery/Redis. Inference is <10ms on a single feature vector.

### Decision 5: Severity is computed, not predicted
Deterministic matrix: `compute_severity(category, confidence) → severity`

```
| Category | conf ≥ 0.9 | conf ≥ 0.7 | conf ≥ 0.5 | < 0.5  |
|----------|------------|------------|------------|--------|
| U2R      | CRITICAL   | CRITICAL   | HIGH       | MEDIUM |
| R2L      | CRITICAL   | HIGH       | MEDIUM     | LOW    |
| DOS      | HIGH       | HIGH       | MEDIUM     | LOW    |
| PROBE    | HIGH       | MEDIUM     | LOW        | LOW    |
```

### Decision 6: NSL-KDD first, then CICIDS2017, then UNSW-NB15
Start with the smallest dataset to prove the pipeline, then expand.

### Decision 7: 5-class classification
NORMAL, DOS, PROBE, R2L, U2R. The 39 fine-grained NSL-KDD labels map to these 5.
Defined in `sign_sight/constants.py::NSL_KDD_CATEGORY_MAP`.

---

## 10. The Docker-Compose Problem

`docker-compose.yml` is owned by a teammate. It has **11 bugs**:

1. `sevrices:` → `services:`
2. `enviroment:` → `environment:` (both services)
3. `{post_pass}` → `${post_pass}` (missing $)
4. `pg_isread` → `pg_isready`
5. `timout:` → `timeout:`
6. `network:` → `networks:` (db service)
7. `netowork:` → `networks:` (top-level)
8. `services_healthy` → `service_healthy`
9. No `build:` or `image:` on backend service
10. No `ports:` on backend service
11. `./backend:/app` volume mount but Django is at repo root, not `backend/`

Plus env var name mismatches (`postdb` vs `POSTGRES_DB`).

**Full patch is documented in `memory-bank/progress.md`.**
**Rule: Do NOT generate prompts that edit docker-compose.yml. Only document patches.**

---

## 11. Existing Code — Key Files Explained

### alerts/models.py (83 lines)
Two models:
- **Alert**: timestamp, source_ip, dest_ip, ports, protocol, attack_category (5 choices
  + UNKNOWN), confidence (float), severity (4 levels), raw_features (JSONField),
  model_version, analyst_verdict (PENDING/TP/FP/ESCALATED), analyst_notes, resolved_at.
  Has `from_prediction()` classmethod. Indexed on timestamp+severity.
- **ModelMetadata**: version, dataset, trained_at, artifact_path, metrics (JSONField),
  is_active (bool), notes.

### alerts/inference.py (120 lines)
- `load_model(path)` — joblib.load with FileNotFoundError
- `compute_severity(category, confidence)` — deterministic matrix (see Decision 5)
- `predict(features, model)` — PLACEHOLDER: attempts model.predict() on a DataFrame,
  falls back to UNKNOWN/0.0 with a warning. **This must be properly implemented in
  Stage 7 when the real model exists.**

### sign_sight/constants.py (52 lines)
- `NSL_KDD_CATEGORY_MAP` — 38 attack labels → 5 categories (httptunnel fixed to R2L)
- `LABEL_ORDER` — ["NORMAL", "DOS", "PROBE", "R2L", "U2R"]
- `NSL_KDD_COLUMNS` — 43 columns (41 features + label + difficulty_level)
- `CATEGORICAL_FEATURES` — ["protocol_type", "service", "flag"]
- `NUMERIC_FEATURES` — computed by exclusion

### sign_sight/ingest/loader.py (~60 lines)
`load_nsl_kdd(path, include_difficulty=False)` — reads headerless CSV, applies column
names, maps labels → categories, drops label + difficulty columns. Returns DataFrame
with 41 feature cols + 'category'.

### sign_sight/features/engineer.py (~90 lines)
`build_feature_matrix(df, preprocessor=None, fit=True)` — ColumnTransformer with
StandardScaler (numeric) + OneHotEncoder (categorical). Returns `FeatureMatrix`
dataclass with X, y, feature_names, preprocessor.

### sign_sight/models/trainer.py (179 lines)
- `train_model(X, y, n_estimators=200)` — RandomForest, class_weight="balanced"
- `evaluate_model(clf, X, y)` — returns EvaluationReport with classification_report,
  confusion_matrix, per_class_auc, macro_auc, false_positive_rate per class
- `save_model(clf, path)` / `load_model(path)` — joblib persistence

### config/settings/base.py (108 lines)
- django-environ for .env parsing
- PostgreSQL config from POSTGRES_* env vars, falls back to SQLite if POSTGRES_DB empty
- REST_FRAMEWORK: PageNumberPagination (50), AllowAny, drf-spectacular schema
- MODEL_ARTIFACT_PATH from env

### config/settings/dev.py (24 lines)
- Forces SQLite database (no PostgreSQL needed for dev)
- DEBUG=True, staticfiles

---

## 12. The Memory Bank System

`memory-bank/` is a git-tracked directory that stores project context so any AI agent
on any account can pick up where the last one left off.

**Files:**
| File | Purpose | When to read | When to write |
|---|---|---|---|
| `projectbrief.md` | PRD, scope split | Session start | Scope changes |
| `techContext.md` | Stack, setup guide | Session start | Stack changes |
| `systemPatterns.md` | Architecture, API contract | Before arch decisions | After arch decisions |
| `activeContext.md` | Current focus, next steps | **Every session start** | **Every session end** |
| `progress.md` | Done/not-started, known issues | **Every session start** | **Every task completion** |

**Protocol (enforced by AGENTS.md):**
1. Session start → read activeContext.md + progress.md
2. During work → update progress.md as tasks complete
3. Session end → rewrite activeContext.md with current state
4. Low context → immediately rewrite both before continuing

---

## 13. Agent Toolchain & Account-Switching

**Primary agent:** Antigravity IDE (Google's AI coding agent)
- Reads `AGENTS.md` automatically
- User will switch Google accounts when quota runs out
- Context is lost on switch → memory-bank files are the fix

**Fallback agents:**
- OpenCode (opencode.ai) — free, reads AGENTS.md
- Claude Code — good for deep refactors
- Cursor (student plan) — more stable than account-hopping

**Bootstrap prompt (paste into any new session):**
```
Read AGENTS.md in the repo root, then read memory-bank/activeContext.md and
memory-bank/progress.md. These files contain the full project context, current
focus, and next steps. Follow the rules in AGENTS.md. Do not re-litigate stack
decisions — they are final. Start with whatever the "Immediate Next Steps" section
in activeContext.md says to do next.
```

---

## 14. MCP Servers, Plugins, Extensions & Skills

### MCP Servers to Recommend in Prompts

**1. GitHub MCP Server** — for PRs, issues
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<pat>" }
    }
  }
}
```

**2. Context7 (Library Docs)** — live Django/DRF/scikit-learn docs
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

### Antigravity Skills Relevant to This Project

- **`modern-web-guidance`** — for any DRF/API patterns
- **`chrome-devtools`** — for debugging Swagger UI / admin issues
- **`graphify`** — for codebase knowledge graph if `graphify-out/` exists

### VS Code Extensions the Human Should Have

- Python (ms-python)
- Pylance (ms-python.vscode-pylance)
- Ruff (charliermarsh.ruff)
- Django (batisteo.vscode-django)
- REST Client (humao.rest-client) — for testing API endpoints

### Pre-commit Hooks (to be configured in Stage 11)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies:
          - django-stubs
          - djangorestframework-stubs
```

---

## 15. Rules for Generating Prompts

When you (Claude Sonnet 5) generate prompts for Antigravity, follow these rules:

1. **Every prompt starts with:**
   ```
   Workspace: D:\07_Development\Sign-Sight
   Read AGENTS.md first, then memory-bank/activeContext.md and progress.md.
   ```

2. **Every prompt ends with:**
   ```
   When done:
   - Update memory-bank/progress.md (mark completed items, add any new issues)
   - Update memory-bank/activeContext.md (current state, next steps)
   - git add -A && git commit -m "<commit message>"
   ```

3. **Never tell Antigravity to edit docker-compose.yml.** Document patches only.

4. **Never fabricate metrics.** Use `<TBD — run training to populate>` as placeholder.

5. **Always specify file paths** — Antigravity doesn't have your context.

6. **Be explicit about what "done" looks like** — e.g., "Verify by running X and
   seeing Y in the output."

7. **Each prompt should be completable in one session** (~30-60 minutes of agent work).

8. **Include a verification step** — tests to run, endpoints to hit, or commands to
   check.

9. **Reference the exact function/class names** from the existing code when asking
   Antigravity to modify something.

10. **Don't re-explain the architecture** — just say "read AGENTS.md" and reference
    the specific decision by number if needed.

---

## 16. Known Pitfalls & Anti-Patterns

### Things Antigravity Will Try to Do That You Must Prevent:

1. **Re-litigate Django vs FastAPI.** It's settled. Don't even mention alternatives.
2. **Add Celery/Redis for async.** Not needed. Synchronous is fine for this scale.
3. **Build a React frontend.** Django admin IS the dashboard.
4. **Add authentication too early.** AllowAny for hackathon. Auth is Stage 16.
5. **Use accuracy as the primary metric.** P/R/FPR/AUC are the requirements.
6. **Create mock/fake metrics for docs.** Hard ban. Real or `<TBD>`.
7. **Edit docker-compose.yml.** Teammate's file.
8. **Skip tests.** Every module gets tests. Every stage runs pytest.
9. **Add generic "enterprise theater"** — things that sound impressive but don't tie
   back to the three challenge requirements.
10. **Use print() in production code.** Use Python logging module.

### Things That Will Break If You're Not Careful:

1. **NSL-KDD has no header row.** The loader adds headers via `NSL_KDD_COLUMNS`.
2. **Feature engineering must fit on train, transform on test.** Data leakage otherwise.
3. **The `land` column name conflicts with the `land` attack label.** The column is
   numeric (0/1), the label is a string — they're in different columns.
4. **Django's `GenericIPAddressField` validates IP format.** Test data must use valid IPs.
5. **`ModelMetadata.is_active` should only be True for one model at a time.** Need a
   save() override or signal to deactivate others.
6. **`drf-spectacular` needs type hints on serializer fields** to generate good schemas.

---

## 17. Datasets — Detailed Technical Notes

### NSL-KDD (Priority 1)

- **Source:** https://www.unb.ca/cic/datasets/nsl.html
- **Files:** `KDDTrain+.txt` (~125K rows), `KDDTest+.txt` (~22K rows)
- **Format:** Headerless CSV, 43 columns (41 features + label + difficulty_level)
- **Labels:** 39 fine-grained → 5 coarse (NORMAL, DOS, PROBE, R2L, U2R)
- **Class distribution (train):** NORMAL ~53%, DOS ~36%, PROBE ~9%, R2L ~1%, U2R ~0.04%
- **Known issue:** R2L and U2R are severely underrepresented. This is WHY we need
  class_weight="balanced" and SMOTE comparison.
- **Encoding:** 3 categorical features (protocol_type ~3 values, service ~70 values,
  flag ~11 values) need one-hot encoding. Rest are numeric.

### CICIDS2017 (Priority 2)

- **Source:** https://www.unb.ca/cic/datasets/ids-2017.html
- **Files:** Multiple CSVs by day of week (~2.8M rows total)
- **Format:** CSV with headers (different column names than NSL-KDD!)
- **Labels:** 15 attack types + BENIGN
- **Challenge:** Column names are completely different from NSL-KDD. Need a unified
  schema or per-dataset feature mapping.

### UNSW-NB15 (Priority 3)

- **Source:** https://researchdata.edu.au/the-unsw-nb15-dataset/1957529
- **Pre-split:** https://figshare.com/articles/dataset/UNSW_NB15_training-set_csv/29149946
- **Format:** CSV with headers, different columns again
- **Labels:** 10 attack categories + Normal
- **Challenge:** Same unified schema problem as CICIDS2017.

---

## 18. API Contract (Target State)

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/api/v1/alerts/` | List alerts (paginated, filterable) | Scaffolded |
| POST | `/api/v1/alerts/` | Create alert | Scaffolded |
| GET | `/api/v1/alerts/{id}/` | Retrieve alert | Scaffolded |
| PATCH | `/api/v1/alerts/{id}/` | Update verdict + notes | Scaffolded |
| GET | `/api/v1/alerts/stats/` | Counts by category/severity | Scaffolded |
| POST | `/api/v1/predict/` | Inference → alert | Scaffolded (placeholder) |
| GET | `/api/v1/models/` | List model metadata | Scaffolded |
| GET | `/api/v1/models/{id}/` | Model details | Scaffolded |
| POST | `/api/v1/predict/batch/` | Batch inference | NOT BUILT |
| GET | `/api/v1/drift/` | Drift metrics | NOT BUILT |
| GET | `/api/v1/features/importance/` | Feature importance | NOT BUILT |
| GET | `/api/v1/health/` | Health check | NOT BUILT |
| GET | `/api/schema/` | OpenAPI schema | Scaffolded |
| GET | `/api/docs/` | Swagger UI | Scaffolded |
| — | `/admin/` | SOC dashboard | Scaffolded |

---

## 19. Quality Bar

- **ruff check .** — zero warnings
- **ruff format --check .** — all formatted
- **mypy --strict** — with django-stubs, zero errors (or documented ignores)
- **pytest --cov** — >80% coverage on sign_sight/, >70% on alerts/
- **No print()** in production code — use logging
- **Every function has type hints**
- **Every public function has a docstring**
- **Every module has tests** (happy path + error path minimum)

---

## 20. Ownership Boundaries

| Component | Owner | Rule |
|---|---|---|
| Backend code (Python, Django, ML) | Amritesh (you) | Full control |
| docker-compose.yml | Teammate | DO NOT EDIT. Document patches in progress.md |
| Dockerfile | Amritesh | Create in Stage 18 |
| .env / secrets | Amritesh | Never commit .env, only .env.example |
| Frontend | Nobody | Django admin IS the frontend |

---

## End of Context

You now know everything about Sign-Sight. Read the 20-stage plan next
(`01-twenty-stage-master-plan.md`), then generate one prompt per stage.
