@echo off
cd /d "%~dp0"
echo Kiem tra ghe/goc cheo, duong di, ten tren dau va thap nhang mien phi.
echo Build rieng, khong restart LIVE. Can khoang 5-10 phut.
echo Ket qua: artifacts\temple-experience-v2\routes\run-report.json
node scripts/check-temple-routes.mjs
pause
