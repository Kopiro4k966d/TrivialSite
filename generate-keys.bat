@echo off
setlocal
cd /d "%~dp0"
start "" http://localhost:3000/admin-panel.html
call npm start
if errorlevel 1 pause
