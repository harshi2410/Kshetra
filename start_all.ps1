# Start LandOS Full Stack
$root = $PSScriptRoot
Write-Host "Starting LandOS Backend API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location '$root'; & '.\.venv\Scripts\Activate.ps1'; python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting LandOS Frontend on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

