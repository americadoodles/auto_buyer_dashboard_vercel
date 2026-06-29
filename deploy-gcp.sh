#!/usr/bin/env bash
# deploy-gcp.sh – One-command deploy via Cloud Build
# Usage:
#   chmod +x deploy-gcp.sh
#   ./deploy-gcp.sh [PROJECT_ID] [REGION]

set -euo pipefail

PROJECT_ID="${1:-$(gcloud config get-value project)}"
REGION="${2:-us-central1}"

echo "==> Deploying to GCP project: $PROJECT_ID  region: $REGION"

gcloud builds submit \
  --project="$PROJECT_ID" \
  --config=cloudbuild.yaml \
  --substitutions="_REGION=$REGION"

echo ""
echo "==> Deploy complete! Fetching service URLs..."
echo ""

API_URL=$(gcloud run services describe auto-buyer-api --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "not deployed")
WEB_URL=$(gcloud run services describe auto-buyer-web --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)' 2>/dev/null || echo "not deployed")

echo "  Backend API : $API_URL"
echo "  Frontend Web: $WEB_URL"
