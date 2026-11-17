@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra di ngang va mua hoa. Build rieng, khong restart LIVE.
node scripts\kiem-tra-huong-nhan-vat.mjs --side-rain
pause
