@echo off
setlocal
cd /d "%~dp0"
node scripts\kiem-tra-giong-que-2027.mjs
if errorlevel 1 goto fail
echo Gui artifacts\fortune2027-voice\run-report.json cho Codex.
pause
exit /b 0
:fail
echo Kiem thu chua dat. Gui run-report.json va log FAIL cho Codex.
pause
exit /b 1
