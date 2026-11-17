@echo off
setlocal
cd /d "%~dp0"
node scripts\kiem-tra-que-2027.mjs
if errorlevel 1 (
  echo Chua qua het kiem thu. Gui log FAIL trong artifacts\fortune2027.
) else (
  echo Kiem thu hoan tat. Khi da dung LIVE, chay npm.cmd run build roi mo lai start.bat de dung ban moi.
)
pause
