@echo off
setlocal

echo =======================================================
echo AI-Based Detection of Illegal Construction in Cities
echo JSPM's JSCOE, Pune ^| Computer Engineering Project
echo =======================================================
echo.

:: Check if Python is installed
py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b
)

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b
)

echo [1/4] Setting up Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    py -m venv venv
)
call venv\Scripts\activate.bat
echo Installing backend dependencies...
pip install -r requirements.txt --quiet

echo.
echo [2/4] Seeding Database (PostgreSQL/Neon)...
py seed.py

echo.
echo [3/4] Setting up Frontend...
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install --legacy-peer-deps
) else (
    echo Checking for new dependencies...
    call npm install --legacy-peer-deps --quiet 2>nul
)

echo.
echo [4/4] Starting Application...
echo Starting backend server (Flask + SocketIO)...
cd ..\backend
call venv\Scripts\activate.bat
start "Backend" cmd /c "venv\Scripts\activate.bat && py app.py"

echo Starting frontend server (React)...
cd ..\frontend
start "Frontend" cmd /c "npm start"

echo.
echo =======================================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo   WebSocket: ws://localhost:5000/live
echo =======================================================
echo.
echo Servers are starting in separate windows.
echo Press any key to exit this launcher...
pause >nul
