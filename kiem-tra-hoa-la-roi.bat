@echo off
cd /d "%~dp0"
echo Kiem tra mua hoa, gio la, 120 nhan vat; nen chay sau LIVE.
echo Build rieng, khong restart LIVE. So sanh FPS capture truoc/sau cung dieu kien.
node scripts/check-gift-nature.mjs --petals --stress
pause
