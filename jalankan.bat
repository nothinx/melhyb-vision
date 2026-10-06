@echo off
rem Jalankan SIGMA dengan klik dua kali: satu server (API + tampilan) di
rem http://localhost:%PORT%. Untuk pengembangan (hot reload) pakai jalankan.ps1.
setlocal
cd /d "%~dp0"
rem Port 8000 sering dipakai aplikasi lain; ganti di sini kalau 8001 juga terpakai.
if "%PORT%"=="" set PORT=8001

if not exist ".venv" (
  echo Membuat lingkungan Python...
  python -m venv .venv || goto gagal
)
echo Memasang paket Python...
".venv\Scripts\python.exe" -m pip install -q -r backend\requirements.txt || goto gagal

if not exist "frontend\dist\index.html" (
  echo Membangun tampilan, sekali saja...
  pushd frontend
  if not exist "node_modules" ( call npm install || goto gagal )
  call npm run build || goto gagal
  popd
)

echo.
echo SIGMA berjalan di http://localhost:%PORT%  ^(tutup jendela ini untuk berhenti^)
start "" "http://localhost:%PORT%"
cd backend
"..\.venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port %PORT%
goto :eof

:gagal
echo.
echo Gagal. Pastikan Python 3.11+ dan Node.js sudah terpasang.
pause
