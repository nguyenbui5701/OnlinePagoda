@echo off
cd /d "%~dp0"
echo Kiem tra camera chuyen dong. Build rieng, KHONG restart LIVE.
echo Them --stress de chay bai 120 nguoi / 30 phut.
node scripts/check-camera-motion.mjs %*
if errorlevel 1 echo CHUA DAT. Gui artifacts\camera-motion\run-report.json va FAIL-*.log
pause
