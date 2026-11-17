@echo off
setlocal
cd /d "%~dp0"
echo Build va du lieu cach ly. Khong restart LIVE.
echo Mac dinh: check nhan vat, combo, bo cuc. Them --stress de chay 120 nguoi / 30 phut.
node scripts\check-temple-completion.mjs %*
set "result=%errorlevel%"
pause
exit /b %result%
