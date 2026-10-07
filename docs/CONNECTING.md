# SignSight Frontend — Backend Connection & Verification Guide

This guide explains how to connect the SignSight frontend to a live Django/DRF backend by setting a single environment variable or using the pre-configured local development proxy.

---

## 1. Quick Start (Single Environment Variable)

The frontend communicates with the backend through typed endpoints defined in `src/api/endpoints.ts`.

### Option A: Local Development (Default Vite Proxy)
By default, the Vite dev server proxies all `/api/*` requests directly to `http://localhost:8000`.

1. Ensure the backend is running at `http://localhost:8000`:
   ```bash
   # From your backend repository
   python manage.py runserver 8000
   ```
2. Start the SignSight frontend:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

---

### Option B: Remote or Staging Backend (`VITE_API_BASE_URL`)
To point the frontend to a remote or staged backend, create or edit `.env.development.local` (or `.env.production`):

```bash
# .env.development.local
VITE_API_BASE_URL=https://api.signsight.yourdomain.com/api
```

Restart the Vite dev server (`npm run dev`) or build for production (`npm run build`).

---

## 2. Environment Variables Reference

| Variable | Default Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api` | Base URL prefix for all API requests. |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:8000` | Target host used by Vite dev proxy when `VITE_API_BASE_URL=/api`. |
| `VITE_GOOGLE_CLIENT_ID` | `""` | Optional Google OAuth 2.0 Client ID for Google SSO. |
| `VITE_POLL_INTERVAL_MS` | `5000` | Polling frequency for health strip, live ingest task progress, and alerts. |

---

## 3. Diagnostics & Health Hub (`/app/connection`)

SignSight includes a built-in diagnostic test runner at `/app/connection`:
- **Live Health Probe:** Pings `GET /api/health/` and reports the status of Database, Redis, Celery, and Model Cascade.
- **Contract Verification:** Executes non-destructive schema checks against all 15 core endpoints.
- **Mismatch Logging:** Catches and logs any unexpected response field differences in real time.
- **One-Click Diagnostic Report:** Exports a structured Markdown summary of backend connectivity and schema compliance.

---

## 4. Zero Mock Verification Guarantee

- **No Fake Data:** If the backend is offline or an endpoint returns 500/503/404, the UI renders clean, actionable `EmptyState` panels and alerts.
- **Deterministic Sigils:** Telemetry identifiers are deterministically mapped to SVG Sigils using 32-bit FNV-1a hashing.
- **Strict Zod Validation:** Every HTTP payload is validated with Zod before being transformed by UI adapters.
