@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo [ERROR] Install Node.js 24+ first.& pause & exit /b 1)
if not exist .env (
  copy .env.example .env >nul
  echo Created .env. Configure DATABASE_URL and SESSION_SECRET, then run this file again.
  notepad .env
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing Decide Visuals dependencies...
  call npm install || (echo [ERROR] npm install failed.& pause & exit /b 1)
)
call npm start
if errorlevel 1 pause
