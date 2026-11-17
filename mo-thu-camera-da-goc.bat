@echo off
setlocal
cd /d "%~dp0"
if not exist "test-results\multicamera-dist\server.mjs" (
  echo Hay chay kiem-tra-camera-da-goc.bat truoc.
  pause
  exit /b 1
)
set "APP_BUILD_DIRECTORY=%CD%\test-results\multicamera-dist"
set "FIXTURE_DATA_DIRECTORY=%CD%\test-results\multicamera-manual-data"
set "FIXTURE_PORT=3189"
echo Ban DEMO rieng: http://127.0.0.1:3189/dashboard/
echo Capture: http://127.0.0.1:3189/overlay/?capture=1
echo Chi du lieu gia lap. Khong ket noi LIVE that. Ctrl+C de dong ban thu.
node --import tsx tests/fixtures/server.ts
pause
