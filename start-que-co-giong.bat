@echo off
setlocal
cd /d "%~dp0"
set TTS_DYNAMIC_ENABLED=1
echo Can dung server cu sau khi ket thuc LIVE truoc khi chay file nay.
echo Bat giong doc ten va loi que qua Google gTTS, cung giong cam on.
node scripts\start-with-voice.mjs
if errorlevel 1 goto fail
exit /b %errorlevel%
:fail
echo Chua khoi dong server moi. Xem loi phia tren: server cu dang chay, thieu Python/FFmpeg, hoac build loi.
pause
exit /b 1
