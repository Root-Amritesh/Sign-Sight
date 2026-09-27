# Sign-Sight — Team Status & Handoff Details

**To my Teammates:** Please read this document to understand what has been completed in the backend, what our current stage is, and what I need from you before I can continue.

---

## 👥 Team Roles (As Defined)
- **Backend & API:** Amritesh
- **ML / Docker / JEPA:** Teammate 3 & Teammate 2 (Assisting)
- **UI / UX (Frontend):** Teammate 1 & Teammate 2

---

## 🏗️ What I Have Done (Backend Foundation)

I have completely scaffolded the backend architecture to make it ready for both the ML models and the Frontend UI. 

**Here is exactly what is built and WHY:**
1. **Django + DRF Project Scaffold:** Set up at the root. *Why:* Django provides a built-in admin panel (which we can use as a fallback SOC dashboard) and Django REST Framework (DRF) allows us to easily serve JSON APIs for the UI/UX team.
2. **Database Models (`alerts/models.py`):** Created the `Alert` and `ModelMetadata` tables. *Why:* To store network anomaly alerts and track which ML model version is currently active.
3. **API Endpoints (`alerts/views.py`):**
   - `GET /api/v1/alerts/` (List all alerts for the frontend)
   - `POST /api/v1/predict/` (The main inference endpoint where flow features come in and alerts get created)
   - `GET /api/docs/` (Swagger UI so the UI/UX team can see the API schema)
4. **ML Bridge (`alerts/inference.py` & `sign_sight/`):** Created the scaffolding where the ML models will plug into the Django app. *Why:* Decouples the heavy ML logic from the web server so they don't block each other.
5. **Agent Memory Bank:** Created `memory-bank/` and `send to claude/` folders. *Why:* I am using AI coding agents (Antigravity/Claude), and these files allow the AI to perfectly remember the project context across sessions.

---

## 🚧 Current Stage: Waiting on ML & Docker

We are currently at a **Handoff Stage**. I have paused backend development because I need the ML and Infra components to be finalized before I can wire them into the live API.

### 👉 Tasks for ML & Docker Team (Teammate 3 & 2)
1. **Fix `docker-compose.yml`:** The current docker-compose file has bugs (typos like `sevrices`, missing ports for backend, etc.). *I have documented the exact fixes needed in `memory-bank/progress.md` under "Known Issues".* Please review and apply them.
2. **Train the ML Models (NSL-KDD / JEPA):** 
   - Train the anomaly detection models.
   - Save the trained model artifacts as `.joblib` or `.pkl` files.
   - Place them in the `artifacts/` folder.
3. **Provide Feature Engineering Logic:** Let me know exactly what pre-processing (scalers, encoders) needs to run on the raw data before passing it to `model.predict()`.

### 👉 Tasks for UI/UX Team (Teammate 1 & 2)
1. You can review the API structure by running the Django server locally (`python manage.py runserver`) and visiting `http://localhost:8000/api/docs/`.
2. This Swagger UI will show you exactly what JSON format to send for predictions and what the Alert JSON looks like.

---

## ⏭️ Next Stage: Backend Finalization (Once ML is ready)

**When the ML team provides the `.joblib` files and the Docker environment is running, I will resume work:**

1. **Wire the Models:** I will load your `.joblib` artifacts into `alerts/inference.py`.
2. **End-to-End Testing:** I will run the API to take in raw network traffic features, run it through your model, and save the resulting alerts to the Postgres database.
3. **Finalize Backend:** Add authentication, rate-limiting, and any specific endpoint formats the UI/UX team requests.

---

**Summary:** The backend skeleton is 100% ready. I am standing by for the ML artifacts and Docker fixes to plug them into the brain of the app!
