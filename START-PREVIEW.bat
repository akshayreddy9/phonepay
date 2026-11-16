@echo off
title PlumPay Preview (browser)
cd /d "%~dp0"
if not exist server\node_modules (cd server & call npm install & cd ..)
if not exist mobile\node_modules (cd mobile & call npm install & cd ..)
rem Start the server in its own window (admin panel at http://localhost:4002/admin).
start "PlumPay Server" cmd /k "cd /d %~dp0server && node src\index.js"
start "" http://localhost:4002/admin
echo.
echo The app preview opens in your browser at http://localhost:8083
echo Admin panel: http://localhost:4002/admin  (admin / admin123)
echo App login: 9876543210, OTP 123456, UPI PIN 1234
echo.
set CI=
cd mobile
call npx expo start --web --port 8083
pause
