@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra nang 120 nhan vat va mua hoa. Nen chay sau LIVE.
node scripts\kiem-tra-huong-nhan-vat.mjs --side-rain --stress
pause
