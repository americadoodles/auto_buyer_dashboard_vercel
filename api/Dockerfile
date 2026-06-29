FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (includes api/db/ with all SQL schemas)
COPY api/ ./api/

# Cloud Run injects PORT env var; default to 8000 to match the deploy config
ENV PORT=8000

EXPOSE ${PORT}

# Migrations are applied automatically on startup by the FastAPI lifespan
# handler (api/core/lifespan.py) — uvicorn binds the port first and runs the
# migration during app startup, so it works on every Cloud Run revision without
# blocking the container's port-listen health check.
#
# NOTE: do NOT prefix this with a blocking `python -m api.core.db && ...` — that
# delays the port bind until migrations finish and fails the Cloud Run health
# check if the DB is briefly slow/unreachable at boot. `python -m api.core.db`
# remains available to run migrations manually (e.g. as a Cloud Run Job).
CMD ["sh", "-c", "uvicorn api.index:app --host 0.0.0.0 --port ${PORT}"]
