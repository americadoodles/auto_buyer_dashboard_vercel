@echo off
echo 🚀 Starting Auto Buyer Demo Development Environment...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found. Please install Python 3.8+
    echo Make sure Python is in your PATH or install from Microsoft Store
    pause
    exit /b 1
)
echo ✅ Python found

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Install Python dependencies
if exist requirements.txt (
    echo 📦 Installing Python dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo ✅ Python dependencies installed
)

REM Install Node.js dependencies
if exist package.json (
    echo 📦 Installing Node.js dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo ✅ Node.js dependencies installed
)

echo.
echo 🎯 Starting development servers...
echo Frontend will be available at: http://localhost:3000
echo Backend will be available at: http://localhost:8001
echo Press Ctrl+C to stop all servers
echo.

REM Start both servers
npm run dev

pause
