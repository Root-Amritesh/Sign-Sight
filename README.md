# Sign Sight

## How to run the code

*Make sure you have nodejs with npm as well as python installed. Latest version works fine
*Make sure the code is upto date with the repository, changes were made in the backend code to link it with the frontend, including some dummy data
## Installation guide

### Frontend
1) Unzip the folder and navigate to frontend directory
   ```cd Sign-Sight/frontend```
1.1) For the first run we need to copy the ENVs to the actual env file
   ```cp .env.example .env```
3) Run
   ``` npm install ``` and then
   ``` npm run dev ```
You can also use the build version using ```npm run build``` and then running the final build generated in DIST but the project is not completed yet.

#### Demo accounts for the front (Remove this from the final README or keep it)
a) `analyst_1`: `analyst_pass_123` (The mock analyst account) 
b) `admin`: `admin_pass_123` (The mock admin account)

### Backend
1) Unzip the folder and navigate to the backend directory
   ```cd Sign-Sight/backend```
2) Make the virtual env before installing the modules
   ``` python3 -m venv venv``` and then ```source venv/bin/activate``` (This is for linux, check how to do this for windows)
3) Create the .env file by copying the example ENV file
   ```cp .env.example .env```
5) Installation
   ```pip install -r requirements-dev.txt```
6) Update the DB schema for the backend
   ```python manage.py migrate```
7) Running
      ```python manage.py runserver```
This is the dev build, code still needs updating.

## Some snapshots from the dev build (frontend)
(Landing Page)
<img width="1544" height="1055" alt="landing_page" src="https://github.com/user-attachments/assets/3b30b71f-ee5f-4698-bc01-e1066f2e5c8a" />
(Sign In)
<img width="1527" height="1044" alt="sign_in" src="https://github.com/user-attachments/assets/8f8fda31-45a1-42b1-b1af-c8c1b51da785" />
(Dashboard)
<img width="1532" height="1059" alt="dashboard" src="https://github.com/user-attachments/assets/2c67ed8d-4b77-4aa1-b4b3-ee2ac9032b7f" />
(Alerts)
<img width="1532" height="1050" alt="alerts" src="https://github.com/user-attachments/assets/587cb5dd-222a-4efa-9c9f-a2bf98fdb7e9" />
(Ingest Mock Data)
<img width="1528" height="1051" alt="mock" src="https://github.com/user-attachments/assets/24fab963-c4cb-492e-a43a-d12ce2d43851" />
(Model Health)
<img width="1528" height="1050" alt="health" src="https://github.com/user-attachments/assets/97c864b5-9b3b-4570-a5b3-f72e6cb400bb" />
(Drift)
<img width="1534" height="1057" alt="drift" src="https://github.com/user-attachments/assets/6abe0645-cba4-42e4-8487-49f966a31f2e" />
(Model Registry)
<img width="1533" height="1059" alt="model_reg" src="https://github.com/user-attachments/assets/9d2d503c-5fcb-4c9f-aacc-0127f4c1caba" />
(audit logs)
<img width="1541" height="1056" alt="log" src="https://github.com/user-attachments/assets/9cc42565-c522-4cb0-9c92-6c807581163e" />
(Admin Settings)
<img width="1529" height="1051" alt="admin_settings" src="https://github.com/user-attachments/assets/e17a5fd5-eee4-426e-b4ee-7958c1f3f758" />

## For the Analyst
(Analyst Dash view)
<img width="1534" height="1060" alt="analyst_dash" src="https://github.com/user-attachments/assets/801964d8-c20d-403a-977f-9eefbab12e50" />
(Analyst Settings)
<img width="1530" height="1058" alt="analyst_settings" src="https://github.com/user-attachments/assets/199ac627-1868-4460-a3f7-a02716862738" />

### A few other pages to document
-> Analyst Ingest page
-> Analyst model health page
-> Analyst drift page

## Contriubutors
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- ALL-CONTRIBUTORS-LIST:END -->




