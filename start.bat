@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 22.12+ hoac 24 LTS. Xem README.md.
  pause
  exit /b 1
)
if not exist node_modules\tsx (
  call npm.cmd ci --no-fund --no-audit
  if errorlevel 1 goto fail
)
if not exist dist\server.mjs goto build
if not exist dist\tiktok-worker.mjs goto build
goto run
:build
  call npm.cmd run build
  if errorlevel 1 goto fail
:run
node scripts\start.mjs
if errorlevel 1 goto fail
exit /b 0
:fail
echo Khong khoi dong duoc. Kiem tra loi phia tren va README.md.
pause
exit /b 1
