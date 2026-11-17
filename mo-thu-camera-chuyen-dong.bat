@echo off
setlocal
cd /d "%~dp0"
if not exist "test-results\camera-motion-dist\server.mjs" (
  echo Hay chay kiem-tra-camera-chuyen-dong.bat truoc.
  pause
  exit /b 1
)
set "APP_BUILD_DIRECTORY=%CD%\test-results\camera-motion-dist"
set "FIXTURE_DATA_DIRECTORY=%CD%\test-results\camera-motion-manual-data"
set "FIXTURE_PORT=3191"
echo Ban DEMO rieng: http://127.0.0.1:3191/dashboard/
echo Capture: http://127.0.0.1:3191/overlay/?capture=1
echo Chi du lieu gia lap. Khong ket noi LIVE that. Ctrl+C de dong ban thu.
node --import tsx tests/fixtures/server.ts
pause
