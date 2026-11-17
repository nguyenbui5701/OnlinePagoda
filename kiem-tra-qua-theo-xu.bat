@echo off
cd /d "%~dp0"
echo Kiem tra qua theo xu, 120 nhan vat. Nen chay sau LIVE de do FPS cong bang.
echo Build rieng; khong restart LIVE, khong ghi de cai dat.
node scripts/check-gift-nature.mjs --stress
pause
