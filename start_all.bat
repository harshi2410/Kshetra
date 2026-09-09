@echo off
echo Starting LandOS Services...
start "LandOS Backend API" cmd /k "cd /d %~dp0 && .venv\Scripts\activate.bat && uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"
start "LandOS Frontend UI" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both LandOS Backend (http://127.0.0.1:8000) and Frontend (http://localhost:5173) are launching!
