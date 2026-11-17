@echo off
cd /d "%~dp0"
echo Kiem tra camera da goc. Build rieng, KHONG restart LIVE.
echo Them --stress de chay bai 120 nguoi / 30 phut.
node scripts/check-multicamera.mjs %*
if errorlevel 1 echo CHUA DAT. Gui artifacts\multicamera\run-report.json va FAIL-*.log
pause
