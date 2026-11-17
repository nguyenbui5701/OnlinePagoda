@echo off
setlocal
cd /d "%~dp0"
echo Kiem thu hoa dang, chup anh va so sanh FPS voi ban truoc. Co the mat vai phut.
node scripts\kiem-tra-hoa-dang.mjs
if errorlevel 1 goto fail
echo Gui artifacts\lantern2027\run-report.json va nhan xet anh cho Codex.
pause
exit /b 0
:fail
echo Chua dat. Gui artifacts\lantern2027\run-report.json va file log FAIL.
pause
exit /b 1
