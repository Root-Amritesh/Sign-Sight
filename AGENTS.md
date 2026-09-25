# AGENTS.md — Sign-Sight Repository Constitution

> **Every agent session MUST start by reading `memory-bank/activeContext.md` and
> `memory-bank/progress.md`.** Before ending a session or when context is running low,
> rewrite both files to capture all decisions, completed work, and next steps.

---

## Project Identity

**Sign-Sight** is an ML-powered network intrusion detection system for SOC teams.
It classifies network traffic as normal or attack (5-class: NORMAL, DOS, PROBE, R2L,
U2R) and surfaces alerts to security analysts — **it never auto-blocks traffic**.

**Hackathon:** Microsoft × Bennett University — industry-deployment track.
**Challenge 26:** "Catch the Attack the Signatures Miss."

---

## Non-Negotiable Rules

1. **No enforcement actions.** No `block()`, no iptables, no firewall calls, no packet
   drops. The only output on an attack path is an `Alert` record. This is a hard rule,
   not a style preference.

2. **No fabricated metrics.** If a number wasn't produced by running code, it doesn't
   appear in any document, README, or comment. Use placeholders like `<TBD>` or
   `<run training to populate>`.

3. **Honest evaluation.** Report precision, recall, false-positive rate, and AUC — not
   just accuracy. This is a challenge requirement.

4. **Handle class imbalance.** Use `class_weight="balanced"` at minimum. Document the
   strategy and its tradeoffs.

5. **Human-in-the-loop.** Alerts carry confidence, attack category, and evidence for
   analyst review. The analyst decides: escalate, block (via firewall, externally), or
   dismiss.

---

## Confirmed Stack — Do Not Re-Litigate

| Component | Choice | Rationale |
|---|---|---|
| Language | Python 3.11 | Team standard, ML ecosystem |
| Web framework | Django 5.x + DRF | Admin = MVP SOC dashboard, ORM migrations, battle-tested |
| ML | scikit-learn (RandomForest baseline) | Challenge-specified, lightweight |
| Database | PostgreSQL (via Docker) | Alert persistence, teammate's docker-compose |
| Testing | pytest + pytest-django | Convention, fixtures, parametrize |
| Linting | ruff + mypy + django-stubs | Lint-clean from day one |
| First dataset | NSL-KDD | Smallest, fastest to prove pipeline end-to-end |

---

## Repository Layout

```
Sign-Sight/
├── AGENTS.md                     # This file — agent constitution
├── README.md                     # Project overview and setup
├── manage.py                     # Django management script
├── docker-compose.yml            # Alert database (teammate-owned, do NOT edit)
├── nids_pipeline_flowchart.svg   # Pipeline diagram
├── .env.example                  # Canonical env vars
├── .gitignore
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml                # ruff + pytest config
├── setup.cfg                     # mypy config
│
├── config/                       # Django project configuration
│   ├── __init__.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py               # Shared settings (environ-based)
│       ├── dev.py                # DEBUG=True, sqlite fallback
│       └── prod.py               # DEBUG=False, security hardening
│
├── alerts/                       # Django app — SOC alert CRUD + inference bridge
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                 # Alert, ModelMetadata
│   ├── admin.py                  # Django admin = MVP SOC dashboard
│   ├── serializers.py            # DRF serializers
│   ├── views.py                  # DRF viewsets + predict endpoint
│   ├── inference.py              # ML ↔ Django bridge
│   ├── urls.py                   # Router registration
│   ├── migrations/
│   └── tests/
│       ├── test_models.py
│       ├── test_views.py
│       └── test_serializers.py
│
├── sign_sight/                   # ML pipeline package (Django-free)
│   ├── __init__.py
│   ├── constants.py              # Label maps, column names, feature lists
│   ├── ingest/
│   │   ├── __init__.py
│   │   └── loader.py             # Dataset loaders (NSL-KDD first)
│   ├── features/
│   │   ├── __init__.py
│   │   └── engineer.py           # Feature engineering + preprocessing
│   └── models/
│       ├── __init__.py
│       └── trainer.py            # Train, evaluate, save/load models
│
├── tests/                        # Tests for ML pipeline (non-Django)
│   ├── __init__.py
│   ├── conftest.py               # Shared fixtures
│   ├── test_ingest.py
│   ├── test_features.py
│   └── test_trainer.py
│
├── memory-bank/                  # Agent context persistence (git-tracked)
│   ├── projectbrief.md           # PRD + scope definition
│   ├── techContext.md            # Stack, env vars, local setup
│   ├── systemPatterns.md         # Architecture, API contract, data flow
│   ├── activeContext.md          # Current focus + next steps
│   └── progress.md              # Done/not-started + known issues
│
├── docs/
│   └── agent-toolchain-setup.md  # MCP servers, subagent config, fallbacks
│
├── datasets/                     # .gitignored — download locally
└── artifacts/                    # .gitignored — trained model files
```

---

## Ownership Boundaries

- **Backend / ML / API / docs:** Agent's responsibility.
- **docker-compose.yml:** Teammate-owned. Do NOT edit directly. Log required patches in
  `memory-bank/progress.md` under "Known Issues — Docker Compose Patches Needed."

---

## Code Standards

- **Type hints** on all function signatures.
- **Docstrings** on all public functions (Google style).
- **No `print()` in production code** — use `logging`.
- **ruff check && ruff format** must pass before commit.
- **mypy --strict** with django-stubs.
- **Tests** for every new module — minimum: one happy path, one error path.

---

## Memory Bank Protocol

1. **Session start:** Read `memory-bank/activeContext.md` + `memory-bank/progress.md`.
2. **During work:** Update `progress.md` as tasks complete.
3. **Session end / low context:** Rewrite `activeContext.md` with current focus, next
   steps, open questions. Rewrite `progress.md` with accurate done/not-started lists.
4. **Architecture changes:** Update `systemPatterns.md`.
5. **Stack changes:** Update `techContext.md`.
6. **Scope changes:** Update `projectbrief.md`.
