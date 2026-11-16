@echo off
title PhonePayy Server
cd /d "%~dp0server"
if not exist node_modules (
  echo Installing server packages...
  call npm install
)
echo.
echo Admin panel will open at http://localhost:4002/admin  (login: admin / admin123)
echo Keep this window open while using the app.
echo.
start "" http://localhost:4002/admin
node src\index.js
pause
