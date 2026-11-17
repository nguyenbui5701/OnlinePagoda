@echo off
cd /d "%~dp0"
echo Kiem tra 3 anh kien truc moi + san V2 + bang 4 giay + camera.
echo Build rieng, khong restart LIVE. Goc theo reference, chi luu 2 anh trai/phai.
echo Anh moi nam trong clean-art\runs de khong ghi de file dang mo.
echo Ket qua: artifacts\temple-experience-v2\clean-art\run-report.json
node scripts/check-temple-experience-v2.mjs
pause
