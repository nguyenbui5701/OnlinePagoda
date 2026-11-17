@echo off
setlocal
cd /d "%~dp0"
echo Tao 5 mau giong Viet bang pipeline hien tai. Can Internet cho gTTS.
node --import tsx scripts\thu-giong-hieu-ung-moi.mjs
pause
