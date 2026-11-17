@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra mat truoc/mat sau. Build rieng, khong restart LIVE.
node scripts\kiem-tra-huong-nhan-vat.mjs
pause
