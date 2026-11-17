@echo off
setlocal
cd /d "%~dp0"
node scripts\kiem-tra-live-mobile.mjs
if errorlevel 1 goto fail
echo PASS. Ket qua trong artifacts\live-mobile-fix.
pause
exit /b 0
:fail
echo Chua dat. Gui artifacts\live-mobile-fix\run-report.json va log FAIL.
pause
exit /b 1
