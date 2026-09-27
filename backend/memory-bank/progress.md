# Progress — Sign-Sight

> **Last updated:** Session 1 (initial scaffolding).

## Completed

- [x] Read existing repo files (README.md, docker-compose.yml, flowchart SVG)
- [x] Audited docker-compose.yml — documented all bugs (see Known Issues below)
- [x] Created `AGENTS.md` — repo constitution for all agents
- [x] Created `memory-bank/projectbrief.md` — PRD with THRESHOLD/DIFFERENTIATOR split
- [x] Created `memory-bank/techContext.md` — stack, rationale, datasets, env vars
- [x] Created `memory-bank/systemPatterns.md` — architecture, API contract, data flow
- [x] Created `memory-bank/activeContext.md` — current focus and next steps
- [x] Created `memory-bank/progress.md` — this file
- [x] Created `docs/agent-toolchain-setup.md` — MCP, subagents, fallbacks, bootstrap
- [x] Created `.env.example` — canonical environment variables
- [x] Created `.gitignore` — Django + Python + ML artifacts
- [x] Created `requirements.txt` — production dependencies
- [x] Created `requirements-dev.txt` — dev/test dependencies
- [x] Created `pyproject.toml` — ruff + pytest config
- [x] Created `setup.cfg` — mypy config
- [x] Created `manage.py` — Django management script
- [x] Created `config/` — Django project config (settings split, urls, wsgi, asgi)
- [x] Created `alerts/` — Django app (models, admin, serializers, views, inference,
  urls, migrations, tests)
- [x] Created `sign_sight/` — ML pipeline package (constants, ingest, features, models)
- [x] Created `tests/` — ML pipeline tests (conftest, test_ingest, test_features,
  test_trainer)
- [x] Updated `README.md` — Django layout, setup instructions, project structure

## Not Started

- [ ] **Step 2:** Download NSL-KDD dataset
- [ ] **Step 2:** Run migrations (`python manage.py migrate`)
- [ ] **Step 2:** Verify test suite passes (`pytest`)
- [ ] **Step 2:** Verify Django admin + Swagger UI load
- [ ] **Step 3:** Write training script (`python -m sign_sight.train`)
- [ ] **Step 3:** Train baseline model, record real metrics
- [ ] **Step 3:** Create ModelMetadata record
- [ ] **Step 4:** Flesh out `alerts/inference.py` with real model loading
- [ ] **Step 4:** Test predict endpoint end-to-end
- [ ] **Step 4:** Test SOC workflow in Django admin
- [ ] **Step 5:** ruff check/format pass
- [ ] **Step 5:** mypy pass
- [ ] **Step 5:** Final README update with real metrics
- [ ] **DIFF D1:** CICIDS2017 ingestion
- [ ] **DIFF D2:** UNSW-NB15 ingestion
- [ ] **DIFF D3:** Model drift monitoring
- [ ] **DIFF D4:** SMOTE comparison
- [ ] **DIFF D5:** Feature importance endpoint
- [ ] **DIFF D6:** Alert statistics endpoint
- [ ] **DIFF D7:** API authentication
- [ ] **DIFF D8:** CI/CD pipeline

---

## Known Issues — Docker Compose Patches Needed

> **Owner: Teammate.** These patches fix bugs in `docker-compose.yml`. Do NOT edit the
> file directly — hand this list to the teammate.

### Patch 1: Typos and Syntax Fixes

```diff
--- a/docker-compose.yml
+++ b/docker-compose.yml
@@ -1,4 +1,4 @@
-sevrices: 
+services:
   db:
     image: postgres:latest 
     container_name: db
     restart: "no"
-    enviroment:
+    environment:
       POSTGRES_DB: ${postdb}
       POSTGRES_USER: ${post_user}
-      POSTGRES_PASSWORD: {post_pass}
+      POSTGRES_PASSWORD: ${post_pass}
     volumes:
       - ./data/postgres_data:/var/lib/postgresql/data
     healthcheck:
-      test: ["CMD-SHELL", "pg_isread -U ${post_user} -d ${post_db}"]
+      test: ["CMD-SHELL", "pg_isready -U ${post_user} -d ${postdb}"]
       interval: 10s
-      timout: 5s
+      timeout: 5s
       retries: 5 
-    network:
+    networks:
       - sign-net
   backend:
     container_name: backend
     restart: "no"
+    build: .
+    ports:
+      - "8000:8000"
     env_file:
       - .env
-    enviroment:
+    environment:
       - post_host=db 
     volumes:
-      - ./backend:/app 
+      - .:/app
     networks:
       - sign-net
     depends_on:
       db:
-        condition: services_healthy
-netowork:
+        condition: service_healthy
+networks:
   sign-net:
     driver: bridge
```

### Patch 2: Standardize Environment Variable Names

The compose file uses `${postdb}`, `${post_user}`, `${post_pass}`, `${post_db}`, and
`post_host`. These should all match `.env.example`:

| Current (compose) | Should be | Matches .env.example |
|---|---|---|
| `${postdb}` | `${POSTGRES_DB}` | ✅ |
| `${post_user}` | `${POSTGRES_USER}` | ✅ |
| `{post_pass}` (missing $) | `${POSTGRES_PASSWORD}` | ✅ |
| `${post_db}` (in healthcheck) | `${POSTGRES_DB}` | ✅ |
| `post_host=db` | `POSTGRES_HOST=db` | ✅ |

### Patch 3: Add build context and command for Django

The `backend` service needs:

```yaml
backend:
  build: .
  ports:
    - "8000:8000"
  command: >
    sh -c "python manage.py migrate &&
           gunicorn config.wsgi:application --bind 0.0.0.0:8000"
```

### Patch 4: Volume mount path

Current: `./backend:/app` — but the Django project is at the repo root, not under
`backend/`. Change to `.:/app`.

### Patch 5: Dockerfile needed

The compose file references a build context but there's no `Dockerfile`. The teammate
should create one:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

---

## Git Commands to Commit

After reviewing the scaffolding, run:

```bash
cd Sign-Sight
git add -A
git status  # review what's being committed
git commit -m "feat: initial Django scaffolding + ML pipeline + memory-bank

- Django 5.x + DRF project with settings split (base/dev/prod)
- alerts app: Alert + ModelMetadata models, admin, serializers, views
- sign_sight ML pipeline: constants, ingest, features, models (Django-free)
- Full test scaffolding with pytest-django
- AGENTS.md + memory-bank for agent context persistence
- docs/agent-toolchain-setup.md for multi-agent workflow
- .env.example, .gitignore, requirements.txt, pyproject.toml"
git push origin main
```
