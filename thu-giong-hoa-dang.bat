@echo off
setlocal
cd /d "%~dp0"
echo Tao 6 mau giong hoa dang bang giong Viet hien tai. Can Internet cho gTTS.
node --import tsx scripts\thu-giong-hoa-dang.mjs
pause
