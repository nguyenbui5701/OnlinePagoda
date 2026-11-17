@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra avatar chi cho qua, hinh moi, giong hoa dang va 120 nguoi.
echo Chay sau LIVE de so FPS. Build rieng, khong restart server LIVE.
node scripts\kiem-tra-hieu-ung-v3.mjs --stress
pause
