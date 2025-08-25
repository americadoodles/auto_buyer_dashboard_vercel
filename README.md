
# Auto Buyer Demo (Ingest → Normalize → Score → Review → Notify)

This is a minimal demo showing an end-to-end buyer workflow:

- **Backend (FastAPI)**: ingest, list, score, and notify endpoints. Optional Postgres persistence.
- **DB**: starter Postgres schema for listings, vehicles, and scores keyed by VIN.
- **Frontend (Next.js + Tailwind)**: Buyer Review UI with load/seed actions, sortable table, and scoring.

## Quickstart (Local, no DB required)

### Option 1: Using Startup Scripts (Recommended)

#### Windows
```bash
# Double-click start-backend.bat or run in PowerShell:
.\start-backend.bat

# In another terminal, start the frontend:
npm install
npm run dev
```

#### macOS/Linux
```bash
# Make script executable and run:
chmod +x start-backend.sh
./start-backend.sh

# In another terminal, start the frontend:
npm install
npm run dev
```

### Option 2: Manual Setup

#### 1. Backend (FastAPI)
```bash
# Navigate to the api directory
cd api

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
uvicorn index:app --reload --port 8001
```

#### 2. Frontend (Next.js)
```bash
# In a new terminal, from the root directory
npm install
npm run dev
```

Open http://localhost:3000

## Frontend Controls

- **Load from Backend**: GET /listings
- **Seed Backend**: POST /ingest with 3 demo listings
- **Re-score Visible**: POST /score (persists to backend in-memory or DB)
- **Notify**: POST /notify for a specific VIN

## Optional: Postgres Persistence

Set `DATABASE_URL` environment variable and the backend will store `vehicles`, `listings`, and `scores` in Postgres. The schema is auto-applied at startup.

### Environment Setup
Create a `.env` file in the root directory:
```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/auto_buyer
```

### Database Setup
```bash
# Create database
createdb auto_buyer

# Or using psql
psql -U postgres -c "CREATE DATABASE auto_buyer;"
```

### Run with Database
```bash
# Set environment variable and run backend
cd api
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auto_buyer  # Windows
# export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auto_buyer  # macOS/Linux

uvicorn index:app --reload --port 8001
```

## API Endpoints

When DB is enabled, writes go to Postgres; otherwise use in-memory storage:
- `GET /healthz` - Health check
- `POST /ingest` - Normalize + store listings
- `GET /listings` - List stored listings joined with latest score
- `POST /score` - Compute and persist scores
- `POST /notify` - Demo notify recorder

## Project Structure

```
├── api/                    # FastAPI backend
│   ├── core/              # Configuration and database
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── schemas/           # Pydantic models
│   └── repositories/      # Data access layer
├── app/                   # Next.js pages
├── components/            # React components
├── styles/                # CSS and Tailwind
└── requirements.txt       # Python dependencies
```

## Dependencies

### Backend (Python)
- FastAPI 0.111.0
- Uvicorn 0.30.0
- Pydantic 2.7.4
- Psycopg 3.1.19 (PostgreSQL adapter)

### Frontend (Node.js)
- Next.js 14.2.4
- React 18.2.0
- Tailwind CSS 3.4.7
- Framer Motion 11.0.0

## Development

The backend runs on port 8001 and the frontend on port 3000. The frontend automatically connects to the backend at `http://localhost:8001`.

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Ensure Python 3.8+ is installed
   - Check if port 8001 is available
   - Verify all dependencies are installed: `pip install -r requirements.txt`

2. **Frontend can't connect to backend**
   - Ensure backend is running on port 8001
   - Check browser console for CORS errors
   - Verify `NEXT_PUBLIC_BACKEND_URL` environment variable if using custom backend URL

3. **Database connection issues**
   - Verify PostgreSQL is running
   - Check `DATABASE_URL` format: `postgresql://user:password@host:port/dbname`
   - Ensure database `auto_buyer` exists

4. **Port already in use**
   - Change backend port: `uvicorn index:app --reload --port 8002`
   - Update frontend environment variable: `NEXT_PUBLIC_BACKEND_URL=http://localhost:8002`

### Environment Variables

Create a `.env` file in the root directory for custom configuration:
```bash
# Backend URL (default: http://localhost:8001)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001

# Database connection (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/auto_buyer
```

## Architecture Diagram
![Auto Buyer Architecture](assets/auto_pipeline_diagram.png)
