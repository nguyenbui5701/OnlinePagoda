@echo off
setlocal
cd /d "%~dp0"
node scripts\open-overlay.mjs
if errorlevel 1 (
  echo Khong mo duoc cua so capture. Kiem tra loi phia tren.
  pause
)
