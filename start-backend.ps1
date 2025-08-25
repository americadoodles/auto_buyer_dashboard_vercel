Write-Host "Starting Auto Buyer Backend..." -ForegroundColor Green

# Navigate to api directory
Set-Location api

# Create virtual environment if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .venv\Scripts\Activate.ps1

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Start server
Write-Host "Starting server on http://localhost:8001" -ForegroundColor Green
uvicorn index:app --reload --port 8001
