@echo off
title PhonePayy App (Expo)
cd /d "%~dp0mobile"
if not exist node_modules (
  echo Installing app packages, this takes a few minutes the first time...
  call npm install
)
rem Expo hides its QR code when CI is set, so clear it.
set CI=
echo.
echo 1. Install "Expo Go" from the Play Store on your Android phone.
echo 2. Connect the phone to the SAME Wi-Fi as this laptop.
echo 3. Scan the QR code below (it also opens in your browser).
call node scripts\show-qr.js 8083
call npx expo start --lan --port 8083
pause
