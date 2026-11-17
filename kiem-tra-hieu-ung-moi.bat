@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra hieu ung moi, avatar gia lap, giong va 120 nguoi. Chay sau LIVE.
echo Build rieng, khong restart server LIVE. Khoang 5-8 phut.
node scripts\kiem-tra-hieu-ung-v2.mjs --stress
pause
