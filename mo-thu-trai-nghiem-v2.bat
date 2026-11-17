@echo off
setlocal
cd /d "%~dp0"
if not exist "test-results\temple-experience-v2-dist\server.mjs" (
  echo Hay chay kiem-tra-trai-nghiem-v2-cum2.bat truoc.
  pause
  exit /b 1
)
set "APP_BUILD_DIRECTORY=%CD%\test-results\temple-experience-v2-dist"
set "FIXTURE_DATA_DIRECTORY=%CD%\test-results\experience-v2-manual"
set "FIXTURE_PORT=3195"
echo DEMO rieng: http://127.0.0.1:3195/dashboard/
echo Overlay: http://127.0.0.1:3195/overlay/?capture=1
echo Bat San phoi canh V2 de duyet ghe va duong di. Go "thap nhang" de thu.
echo Toc do di o muc Giao dien. Chua phai ban LIVE.
node --import tsx tests/fixtures/server.ts
pause
