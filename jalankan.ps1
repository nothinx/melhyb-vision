# Jalankan backend dan frontend untuk pengembangan lokal di Windows.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) { python -m venv .venv }
& .\.venv\Scripts\Activate.ps1
pip install -q -r backend\requirements-dev.txt

Start-Process -NoNewWindow powershell -ArgumentList @(
  "-NoProfile", "-Command",
  "Set-Location '$PSScriptRoot\backend'; & '$PSScriptRoot\.venv\Scripts\uvicorn.exe' app.main:app --reload --port 8000"
)

Set-Location frontend
if (-not (Test-Path "node_modules")) { npm install }
npm run dev
