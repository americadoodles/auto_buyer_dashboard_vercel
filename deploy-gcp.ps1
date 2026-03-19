# deploy-gcp.ps1 – One-command deploy via Cloud Build (PowerShell)
# Usage:
#   .\deploy-gcp.ps1 [-ProjectId YOUR_PROJECT] [-Region us-central1]

param(
    [string]$ProjectId = (gcloud config get-value project 2>$null),
    [string]$Region = "us-central1"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Deploying to GCP project: $ProjectId  region: $Region" -ForegroundColor Cyan

gcloud builds submit `
    --project="$ProjectId" `
    --config=cloudbuild.yaml `
    --substitutions="_REGION=$Region"

Write-Host ""
Write-Host "==> Deploy complete! Fetching service URLs..." -ForegroundColor Green

$ApiUrl  = gcloud run services describe auto-buyer-api --region="$Region" --project="$ProjectId" --format='value(status.url)' 2>$null
$WebUrl  = gcloud run services describe auto-buyer-web --region="$Region" --project="$ProjectId" --format='value(status.url)' 2>$null

Write-Host "  Backend API : $ApiUrl"
Write-Host "  Frontend Web: $WebUrl"
