#!/bin/bash

echo "Starting Auto Buyer Backend..."

# Navigate to api directory
cd api

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start server
echo "Starting server on http://localhost:8001"
uvicorn index:app --reload --port 8001
