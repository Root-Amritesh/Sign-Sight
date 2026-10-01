# Sign-Sight Backend ⚙️

> **Production-grade Django + DRF backend powering the Sign-Sight Network Intrusion Detection System.**

This directory houses the complete API, ML model registry, data ingestion pipeline, alert decision engine, drift monitoring, and compliance audit trail.

---

## 🏗️ Architecture & App Structure

The backend is decomposed into six domain-isolated Django applications following Clean Architecture principles:

```
backend/
├── apps/
│   ├── accounts/          # Dual Auth (JWT + Google OAuth), User roles (admin/analyst), health check
│   ├── alerting/          # Alert lifecycle, 3-way decision engine, Teams notifications, threshold config
│   ├── audit/             # Immutable audit logging for forensic and compliance tracking
│   ├── common/            # Shared middleware, exception handlers, throttling, pagination
│   ├── inference/         # In-memory thread-safe model registry, hot-swapping, and rollback logic
│   ├── ingestion/         # Single-record & batch CSV network flow ingestion, replay simulator
│   └── metrics/           # Per-class metrics API, Wasserstein concept drift detection
├── config/                # Django project settings, root URLs, Celery configuration
├── ml_artifacts/          # Versioned ML model joblib bundles & metadata sidecars
├── requirements/          # Environment-segregated dependencies (base, dev, ml, prod)
├── scripts/               # Utility scripts (generate_mock_model.py)
├── tests/                 # Integration and unit tests
├── Dockerfile             # Multi-stage production container build
├── docker-compose.yml     # Full-stack composition (Django, Postgres, Redis, Celery)
└── manage.py              # Django CLI entrypoint
```

---

## 🚀 Quickstart Commands

### 1. Environment Setup

```bash
# Create and activate virtual environment
# Windows:
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Linux / macOS:
python3 -m venv .venv
source .venv/bin/activate

# Install development & ML dependencies
pip install -r requirements/dev.txt

# Setup environment variables
cp .env.example .env
```

### 2. Database & Mock Model

```bash
# Apply database migrations
python manage.py migrate

# Seed default demo accounts (admin / analyst)
python manage.py seed_demo

# Generate mock model for local development
python scripts/generate_mock_model.py
```

### 3. Running Services

```bash
# Run Django dev server
python manage.py runserver 0.0.0.0:8000

# (Optional) Run Celery worker for async tasks
celery -A config worker -l INFO

# (Optional) Run Celery beat for automated drift detection snapshots
celery -A config beat -l INFO
```

---

## 🧪 Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=apps --cov-report=term-missing
```

---

## 📖 API Documentation

Once the server is running, explore the interactive OpenAPI 3.0 documentation:
* **Swagger UI:** `http://localhost:8000/api/schema/swagger-ui/`
* **ReDoc:** `http://localhost:8000/api/schema/redoc/`
