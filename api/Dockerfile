FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code and schema
COPY api/ ./api/
COPY db/schema.sql ./db/schema.sql

# Cloud Run injects PORT env var (default 8080)
ENV PORT=8080

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn api.index:app --host 0.0.0.0 --port ${PORT}"]
