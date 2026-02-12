"""
Service that proxies requests to the deployed AI Recommender API.
Base URL: https://auto-buyer-ai-411522296218.us-central1.run.app
"""

import httpx
import logging
import os

logger = logging.getLogger(__name__)

AI_API_BASE_URL = os.getenv(
    "AI_RECOMMENDER_API_URL",
    "https://auto-buyer-ai-411522296218.us-central1.run.app"
)

_TIMEOUT = 60.0  # seconds – RAG queries can be slow


async def ask_question(question: str, k: int = 5) -> dict:
    """
    POST /api/v1/ask – Ask a natural-language question about inventory (RAG).
    """
    url = f"{AI_API_BASE_URL}/api/v1/ask"
    payload = {"question": question, "k": k}
    logger.info("AI ask → %s  payload=%s", url, payload)

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        logger.info("AI ask ← status=%s", resp.status_code)
        return data


async def recommend_vehicle(vin: str) -> dict:
    """
    POST /api/v1/recommend – Get AI buy/pass recommendation for a vehicle.
    """
    url = f"{AI_API_BASE_URL}/api/v1/recommend"
    payload = {"vin": vin}
    logger.info("AI recommend → %s  vin=%s", url, vin)

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        logger.info("AI recommend ← status=%s", resp.status_code)
        return data


async def match_vehicles() -> dict:
    """
    POST /api/v1/match – Match available vehicles to active leads.
    """
    url = f"{AI_API_BASE_URL}/api/v1/match"
    payload = {}
    logger.info("AI match → %s", url)

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        logger.info("AI match ← status=%s", resp.status_code)
        return data
