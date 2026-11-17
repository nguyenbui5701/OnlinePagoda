@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra san Quan Am. Khong restart LIVE.
node scripts\kiem-tra-san-quan-am.mjs
pause
