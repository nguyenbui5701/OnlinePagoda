@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra nang 120 nguoi, so FPS chanh dien va san Quan Am. Chay sau LIVE.
node scripts\kiem-tra-san-quan-am.mjs --stress
pause
