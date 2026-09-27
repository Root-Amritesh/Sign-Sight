# Tech Context — Sign-Sight

## Stack Choices & Rationale

### Python 3.11

Team standard. scikit-learn, pandas, numpy all have excellent 3.11 support. No need for
3.12+ features; 3.11 is the safest choice for a hackathon with broad library compat.

### Django 5.x + Django REST Framework

This replaced an earlier FastAPI + SQLAlchemy plan. The switch was deliberate:

- **Django admin is the MVP SOC dashboard.** The challenge requires "alerting the SOC."
  Django admin gives us a filterable, searchable, editable alert list with zero frontend
  code. Register the Alert model, configure `list_display`, `list_filter`,
  `search_fields`, and `readonly_fields` — an analyst can triage alerts immediately.
  Building this in FastAPI would mean writing a custom frontend or a bare-bones CLI.

- **Django ORM + migrations.** Schema changes are versioned and applied automatically.
  No manual SQL, no Alembic config. For a hackathon timeline, this matters.

- **DRF gives us browsable API + OpenAPI (drf-spectacular).** Judges can explore the
  API in a browser. The schema auto-generates from serializers.

- **Battle-tested auth/permissions.** Django's built-in User model + session auth means
  we can lock down the admin with zero extra work. DRF permissions layer on top.

### scikit-learn (RandomForestClassifier)

Challenge-specified. RandomForest is a strong baseline for tabular IDS data:
- Handles mixed feature types after encoding.
- `class_weight="balanced"` adjusts class weights inversely proportional to frequency,
  directly addressing the imbalance requirement.
- `predict_proba()` gives calibrated confidence scores for alert severity.
- Fast to train on NSL-KDD (~125K rows × 41 features).

### PostgreSQL

Alert persistence. Teammate provisions it via docker-compose. Chosen over SQLite for:
- Concurrent access (multiple API workers).
- JSON field support for `raw_features` and `metrics`.
- Production parity (what judges expect to see).

### imbalanced-learn

For DIFFERENTIATOR D4 (SMOTE comparison). Not used in baseline — baseline uses
`class_weight="balanced"`. Installed so it's available when we get to D4.

### Additional Libraries

| Library | Purpose |
|---|---|
| `django-environ` | 12-factor env var parsing in settings |
| `django-filter` | Declarative queryset filtering for DRF viewsets |
| `drf-spectacular` | OpenAPI 3.0 schema generation from DRF serializers |
| `psycopg[binary]` | PostgreSQL adapter (psycopg 3, async-ready) |
| `gunicorn` | Production WSGI server |
| `joblib` | Model serialization (scikit-learn's recommended format) |
| `pandas` | Dataset loading and feature engineering |
| `numpy` | Numeric operations |

### Dev Dependencies

| Library | Purpose |
|---|---|
| `pytest` + `pytest-django` | Testing framework |
| `pytest-cov` | Coverage reporting |
| `factory-boy` | Test data factories for Django models |
| `ruff` | Linting + formatting (replaces flake8/black/isort) |
| `mypy` + `django-stubs` + `drf-stubs` | Static type checking |
| `pre-commit` | Git hook management |

---

## Datasets

| Dataset | Size | Classes | Use in project | Source |
|---|---|---|---|---|
| **NSL-KDD** | ~125K train, ~22K test | 5 (NORMAL + 4 attack types) | First dataset — prove pipeline E2E | [unb.ca](https://www.unb.ca/cic/datasets/nsl.html) |
| **CICIDS2017** | ~2.8M rows | 15 attack types | DIFFERENTIATOR D1 — multi-dataset | [unb.ca](https://www.unb.ca/cic/datasets/ids-2017.html) |
| **UNSW-NB15** | ~2.5M rows | 10 attack types | DIFFERENTIATOR D2 — three-dataset | [research.data.edu.au](https://researchdata.edu.au/the-unsw-nb15-dataset/1957529) |

NSL-KDD is the priority. It's small enough to iterate quickly, well-studied (results
are comparable to published benchmarks), and has a clean train/test split.

### NSL-KDD Label Mapping

The 39 fine-grained attack labels map to 5 coarse categories defined in
`sign_sight/constants.py`:

- **NORMAL** — legitimate traffic
- **DOS** — denial-of-service (neptune, smurf, back, land, pod, teardrop, etc.)
- **PROBE** — surveillance/scanning (satan, ipsweep, nmap, portsweep, etc.)
- **R2L** — remote-to-local unauthorized access (guess_passwd, ftp_write, imap, etc.)
- **U2R** — user-to-root privilege escalation (buffer_overflow, rootkit, perl, etc.)

---

## Environment Variables

Defined in `.env.example`, loaded by `django-environ` in `config/settings/base.py`:

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | (none, required) | Django secret key |
| `DEBUG` | `True` | Django debug mode |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `DJANGO_SETTINGS_MODULE` | `config.settings.dev` | Settings module path |
| `POSTGRES_DB` | `sign_sight` | Database name |
| `POSTGRES_USER` | `sign_sight` | Database user |
| `POSTGRES_PASSWORD` | (none, required) | Database password |
| `POSTGRES_HOST` | `localhost` | Database host (`db` inside Docker) |
| `POSTGRES_PORT` | `5432` | Database port |
| `MODEL_ARTIFACT_PATH` | `artifacts/` | Directory for trained model files |

---

## Local Development Setup

### Without Docker (recommended for development)

```bash
# 1. Clone and enter the repo
git clone https://github.com/Root-Amritesh/Sign-Sight.git
cd Sign-Sight

# 2. Create virtualenv
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements-dev.txt

# 4. Set up environment
cp .env.example .env
# Edit .env: set SECRET_KEY to a random string

# 5. Run migrations (uses SQLite in dev by default)
python manage.py migrate

# 6. Create a superuser (for Django admin / SOC dashboard)
python manage.py createsuperuser

# 7. Start the dev server
python manage.py runserver

# 8. Open the SOC dashboard
# → http://localhost:8000/admin/
# → http://localhost:8000/api/docs/  (Swagger UI)
```

### With Docker (once teammate fixes docker-compose.yml)

```bash
# 1. Copy and configure .env
cp .env.example .env
# Set POSTGRES_HOST=db (Docker service name, not localhost)

# 2. Start the stack
docker compose up -d

# 3. Run migrations inside the container
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=sign_sight --cov=alerts --cov-report=term-missing

# Just ML pipeline tests
pytest tests/

# Just Django tests
pytest alerts/tests/

# Linting
ruff check .
ruff format --check .

# Type checking
mypy sign_sight/ alerts/ config/
```

### Downloading NSL-KDD

```bash
mkdir -p datasets
# Download KDDTrain+.txt and KDDTest+.txt from:
# https://www.unb.ca/cic/datasets/nsl.html
# Place them in datasets/
```
