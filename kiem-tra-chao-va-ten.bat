@echo off
setlocal
cd /d "%~dp0"
node scripts\kiem-tra-welcome-feedback.mjs
if errorlevel 1 goto fail
echo PASS. Xem artifacts\welcome-feedback.
pause
exit /b 0
:fail
echo Chua dat. Gui artifacts\welcome-feedback\run-report.json va log FAIL.
pause
exit /b 1
