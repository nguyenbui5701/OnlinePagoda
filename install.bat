@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 22.12+ hoac 24 LTS. Xem README.md.
  pause
  exit /b 1
)
call npm.cmd ci --no-fund --no-audit
if errorlevel 1 goto fail
call npm.cmd run build
if errorlevel 1 goto fail
echo Cai dat thanh cong. Chay start.bat de mo Vuon Sen.
exit /b 0
:fail
echo Cai dat chua thanh cong. Kiem tra mang va thong bao loi ben tren.
pause
exit /b 1
