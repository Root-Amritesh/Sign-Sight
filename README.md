
# Sign Sight

## Prerequisites

* Ensure you have **Node.js** (with npm) and **Python** installed (latest stable versions recommended).
* Ensure your local branch is up to date with the repository. Recent updates include backend integration hooks and mock data.

---

## Installation Guide

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd Sign-Sight/frontend
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies and run the development server:**
   ```bash
   npm install
   npm run dev
   ```

> **Note:** A production build can be generated via `npm run build` and served from the `dist` folder, but active development is ongoing.

#### Demo Accounts
* **Analyst:** `analyst_1` / `analyst_pass_123`
* **Admin:** `admin` / `admin_pass_123`

---

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd Sign-Sight/backend
   ```

2. **Create and activate a virtual environment:**
   * **Linux/macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   * **Windows:**
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements-dev.txt
   ```

5. **Apply database migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Start the development server:**
   ```bash
   python manage.py runserver
   ```

---

## Dev Build Previews

### General & Admin Views

#### Landing Page
<img width="1544" height="1055" alt="landing_page" src="https://github.com/user-attachments/assets/3b30b71f-ee5f-4698-bc01-e1066f2e5c8a" /> 

#### Sign In
<img width="1527" height="1044" alt="sign_in" src="https://github.com/user-attachments/assets/8f8fda31-45a1-42b1-b1af-c8c1b51da785" /> 
#### Dashboard
<img width="1532" height="1059" alt="dashboard" src="https://github.com/user-attachments/assets/2c67ed8d-4b77-4aa1-b4b3-ee2ac9032b7f" /> 
#### Alerts
<img width="1532" height="1050" alt="alerts" src="https://github.com/user-attachments/assets/587cb5dd-222a-4efa-9c9f-a2bf98fdb7e9" /> 
#### Ingest Mock Data
<img width="1528" height="1051" alt="mock" src="https://github.com/user-attachments/assets/24fab963-c4cb-492e-a43a-d12ce2d43851" /> 
#### Model Health
<img width="1528" height="1050" alt="health" src="https://github.com/user-attachments/assets/97c864b5-9b3b-4570-a5b3-f72e6cb400bb" /> 
#### Drift
<img width="1534" height="1057" alt="drift" src="https://github.com/user-attachments/assets/6abe0645-cba4-42e4-8487-49f966a31f2e" /> 
#### Model Registry
<img width="1533" height="1059" alt="model_reg" src="https://github.com/user-attachments/assets/9d2d503c-5fcb-4c9f-aacc-0127f4c1caba" /> 
#### Audit Logs
<img width="1541" height="1056" alt="log" src="https://github.com/user-attachments/assets/9cc42565-c522-4cb0-9c92-6c807581163e" /> 
#### Admin Settings
 <img width="1529" height="1051" alt="admin_settings" src="https://github.com/user-attachments/assets/e17a5fd5-eee4-426e-b4ee-7958c1f3f758" />
 
---

### Analyst Views

#### Analyst Dashboard
<img width="1534" height="1060" alt="analyst_dash" src="https://github.com/user-attachments/assets/801964d8-c20d-403a-977f-9eefbab12e50" /> 
#### Analyst Settings
<img width="1530" height="1058" alt="analyst_settings" src="https://github.com/user-attachments/assets/199ac627-1868-4460-a3f7-a02716862738" /> 

---

### Pending Documentation
* Analyst Ingest page
* Analyst Model Health page
* Analyst Drift page

---

## Contributors

## Contributors

<a href="https://github.com/Root-Amritesh/Sign-Sight/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Root-Amritesh/Sign-Sight" />
</a>

