@echo off
setlocal
cd /d "%~dp0"
echo Kiem tra giong gTTS bang cau mau, khong tao qua hay doi phien LIVE.
node --import tsx scripts\check-live-audio.mjs
if errorlevel 1 goto fail
echo Mo artifacts\live-mobile-fix\giong-live.wav de nghe thu.
pause
exit /b 0
:fail
echo Gui artifacts\live-mobile-fix\audio-check.json cho Codex.
pause
exit /b 1
