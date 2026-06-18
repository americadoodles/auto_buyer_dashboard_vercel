FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (includes api/db/ with all SQL schemas)
COPY api/ ./api/

# Cloud Run injects PORT env var (default 8080)
ENV PORT=8080

EXPOSE ${PORT}

# On every revision startup, apply + verify DB migrations BEFORE serving.
# `python -m api.core.db` runs the same idempotent migration list the app uses
# and exits non-zero if a critical table is still missing; the `&&` means a
# failed migration aborts container start, so Cloud Run keeps the previous
# healthy revision serving instead of promoting a broken one.
CMD ["sh", "-c", "python -m api.core.db && uvicorn api.index:app --host 0.0.0.0 --port ${PORT}"]
