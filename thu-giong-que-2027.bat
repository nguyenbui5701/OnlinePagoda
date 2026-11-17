@echo off
setlocal
cd /d "%~dp0"
echo Tao mau giong Google gTTS voi ten gia lap Khach An Lanh. Can Internet, Python va FFmpeg.
node --import tsx scripts\thu-giong-que-2027.mjs
if errorlevel 1 goto fail
echo Mo artifacts\fortune2027-voice\thu-giong-que.wav de nghe thu.
pause
exit /b 0
:fail
echo Chua tao duoc giong. Gui artifacts\fortune2027-voice\voice-sample-report.json cho Codex.
pause
exit /b 1
