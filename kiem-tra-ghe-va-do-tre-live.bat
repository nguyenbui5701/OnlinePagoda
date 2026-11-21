@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra ghe va hang cho LIVE. Khong restart LIVE.
echo Mac dinh: typecheck va unit. Them --e2e de build rieng va kiem thu giao dien.
node scripts\check-live-seat-latency.mjs %*
set "result=%errorlevel%"
pause
exit /b %result%
