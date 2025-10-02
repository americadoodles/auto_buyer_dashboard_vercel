# Auto Buyer Demo - Development Startup Script
# This script starts both the FastAPI backend and Next.js frontend

Write-Host "🚀 Starting Auto Buyer Demo Development Environment..." -ForegroundColor Green

# Check if Python is installed
try {
    python --version | Out-Null
    Write-Host "✅ Python found" -ForegroundColor Green
} catch {
    try {
        python3 --version | Out-Null
        Write-Host "✅ Python3 found" -ForegroundColor Green
    } catch {
        Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
        Write-Host "Make sure Python is in your PATH or install from Microsoft Store" -ForegroundColor Yellow
        exit 1
    }
}

# Check if Node.js is installed
try {
    node --version | Out-Null
    Write-Host "✅ Node.js found" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    npm --version | Out-Null
    Write-Host "✅ npm found" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm" -ForegroundColor Red
    exit 1
}

# Install Python dependencies if requirements.txt exists
if (Test-Path "requirements.txt") {
    Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
    
    # Try pip first, then pip3
    try {
        pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) {
            throw "pip failed"
        }
    } catch {
        try {
            pip3 install -r requirements.txt
            if ($LASTEXITCODE -ne 0) {
                throw "pip3 failed"
            }
        } catch {
            Write-Host "❌ Failed to install Python dependencies with both pip and pip3" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "✅ Python dependencies installed" -ForegroundColor Green
}

# Install Node.js dependencies if package.json exists
if (Test-Path "package.json") {
    Write-Host "📦 Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js dependencies installed" -ForegroundColor Green
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found. Creating default .env..." -ForegroundColor Yellow
    @"
# Auto Buyer Demo Environment Variables
# Database (optional - comment out if not using database)
# DATABASE_URL=postgresql://username:password@localhost:5432/auto_buyer

# Backend URL (optional - defaults to /api)
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8001/api
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created default .env file" -ForegroundColor Green
}

Write-Host "`n🎯 Starting development servers..." -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend will be available at: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Yellow

# Start both servers concurrently
try {
    npm run dev
} catch {
    Write-Host "❌ Failed to start development servers" -ForegroundColor Red
    Write-Host "Try running 'npm run dev' manually" -ForegroundColor Yellow
    exit 1
}
