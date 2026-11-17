@echo off
setlocal
cd /d "%~dp0"
node scripts\kiem-tra-live-experience.mjs
if errorlevel 1 goto fail
echo PASS. Xem anh, video va run-report.json trong artifacts\live-experience.
pause
exit /b 0
:fail
echo Chua dat. Gui artifacts\live-experience\run-report.json va log FAIL.
pause
exit /b 1
