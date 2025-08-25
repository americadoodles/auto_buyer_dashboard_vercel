@echo off
echo Starting Auto Buyer Backend...
cd api
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)
echo Activating virtual environment...
call .venv\Scripts\Activate.ps1
echo Installing dependencies...
pip install -r requirements.txt
echo Starting server on http://localhost:8001
uvicorn index:app --reload --port 8001
pause
