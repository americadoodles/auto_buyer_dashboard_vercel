# Vehicle Damage Detection Service
#
# Analyzes listing images with an OpenAI vision model and produces a
# structured JSON damage report. Pure service layer: no DB access here —
# persistence is handled by the agent runner / routes.

from typing import Any, Dict, List, Optional
import json
import logging

from openai import OpenAI

from ..core.config import settings

logger = logging.getLogger(__name__)

# Vision-capable model. gpt-4o-mini accepts image inputs and is the cheapest
# option that produces reliable structured output.
VISION_MODEL = "gpt-4o-mini"

# Hard cap on images per listing to bound cost and latency per call.
MAX_IMAGES_PER_LISTING = 6

ALLOWED_SEVERITIES = {"minor", "moderate", "severe"}
ALLOWED_CONDITIONS = {"excellent", "good", "fair", "poor", "damaged"}

# Vehicle classes the agent analyzes; everything else is reported but skipped.
ALLOWED_CATEGORIES = {
    "passenger", "light_commercial",                       # in scope
    "heavy_commercial", "motorcycle", "rv_camper", "bus",  # out of scope
    "equipment", "trailer", "boat", "other",
}
IN_SCOPE_CATEGORIES = {"passenger", "light_commercial"}

_SYSTEM_PROMPT = (
    "You are an expert automotive damage inspector. You analyze vehicle photos "
    "and produce precise, conservative damage assessments. Only report damage "
    "you can actually see — never invent or assume damage that is not visible. "
    "Always respond with a single valid JSON object and nothing else."
)


def _get_client() -> OpenAI:
    """Initialized OpenAI client; raises ValueError when AI is not configured."""
    if not settings.AI_ENABLED or not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")
    try:
        return OpenAI(api_key=settings.OPENAI_API_KEY)
    except Exception as e:
        logger.error("Error initializing OpenAI client: %s", e)
        raise ValueError(f"Failed to initialize OpenAI client: {e}")


def _build_user_prompt(listing: Dict[str, Any], image_count: int) -> str:
    vehicle_desc_parts = [
        str(listing.get(k)) for k in ("year", "make", "model", "trim") if listing.get(k)
    ]
    vehicle_desc = " ".join(vehicle_desc_parts) or "Unknown vehicle"

    return f"""Inspect the {image_count} attached photo(s) of this vehicle listing.

Vehicle: {vehicle_desc}
Listing ID: {listing.get('id')}

STEP 1 — CLASSIFY the vehicle into exactly one category:
- "passenger": cars, sedans, coupes, hatchbacks, SUVs, crossovers, minivans, pickup trucks (consumer/half-ton class)
- "light_commercial": cargo/panel vans, utes, light box trucks, chassis cabs up to ~3.5t GVW
- "heavy_commercial": semi trucks, heavy-duty box trucks, dump trucks, commercial rigs
- "motorcycle": motorcycles, scooters, ATVs, UTVs, dirt bikes
- "rv_camper": motorhomes, campers
- "bus": buses, shuttles
- "equipment": construction/agricultural machinery, forklifts, tractors
- "trailer": standalone trailers
- "boat": watercraft
- "other": anything else or no vehicle visible

STEP 2 — ONLY IF the category is "passenger" or "light_commercial", detect ALL visible damage.
For any other category, set damages to an empty array and explain the classification in the summary.

For every damaged part you can SEE in the photos, report:
- part: the specific vehicle part (e.g. "front bumper", "hood", "driver door", "windshield", "left fender", "rear quarter panel", "wheel/rim", "headlight", "taillight", "side mirror", "roof", "trunk lid", "interior seat", "dashboard")
- damage_type: one of "dent", "scratch", "crack", "rust", "paint damage", "missing part", "broken glass", "hail damage", "collision damage", "wear", "stain/tear", "other"
- severity: "minor" | "moderate" | "severe"
- location: where on the vehicle (e.g. "front left", "rear right", "passenger side")
- description: 1-2 sentence factual description of what is visible
- image_index: 0-based index of the photo where the damage is most visible
- confidence: 0.0-1.0 — how confident you are this is real damage and not glare/reflection/dirt
- estimated_repair_cost_usd: rough USD repair estimate as {{"low": number, "high": number}}, or null if not estimable

Respond with EXACTLY this JSON shape:
{{
  "vehicle_category": "passenger" | "light_commercial" | "heavy_commercial" | "motorcycle" | "rv_camper" | "bus" | "equipment" | "trailer" | "boat" | "other",
  "vehicle_identified": "short description of the vehicle you see, or null",
  "overall_condition": "excellent" | "good" | "fair" | "poor" | "damaged",
  "damage_detected": true | false,
  "damages": [
    {{
      "part": "front bumper",
      "damage_type": "dent",
      "severity": "moderate",
      "location": "front left",
      "description": "...",
      "image_index": 0,
      "confidence": 0.92,
      "estimated_repair_cost_usd": {{"low": 150, "high": 400}}
    }}
  ],
  "clean_panels": ["parts that are clearly visible and undamaged"],
  "image_quality_issues": ["e.g. 'image 2 is blurry', 'no rear view provided'"],
  "total_estimated_repair_cost_usd": {{"low": 0, "high": 0}} or null,
  "summary": "2-3 sentence overall assessment"
}}

If no damage is visible, return damage_detected=false with an empty damages array.
Do not flag dirt, water droplets, reflections, or shadows as damage unless clearly damage."""


def _clamp_confidence(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def _normalize_cost(value: Any) -> Optional[Dict[str, float]]:
    if not isinstance(value, dict):
        return None
    try:
        low = float(value.get("low", 0))
        high = float(value.get("high", 0))
    except (TypeError, ValueError):
        return None
    if low < 0 or high < 0:
        return None
    return {"low": round(min(low, high), 2), "high": round(max(low, high), 2)}


def _normalize_report(raw: Dict[str, Any], image_count: int) -> Dict[str, Any]:
    """Validate and normalize the model output into a stable report schema."""
    damages: List[Dict[str, Any]] = []
    for item in raw.get("damages") or []:
        if not isinstance(item, dict) or not item.get("part"):
            continue
        severity = str(item.get("severity", "")).lower()
        image_index = item.get("image_index")
        if not isinstance(image_index, int) or not (0 <= image_index < image_count):
            image_index = None
        damages.append({
            "part": str(item["part"]).strip().lower(),
            "damage_type": str(item.get("damage_type", "other")).strip().lower(),
            "severity": severity if severity in ALLOWED_SEVERITIES else "minor",
            "location": (str(item["location"]).strip() if item.get("location") else None),
            "description": (str(item["description"]).strip() if item.get("description") else None),
            "image_index": image_index,
            "confidence": _clamp_confidence(item.get("confidence")),
            "estimated_repair_cost_usd": _normalize_cost(item.get("estimated_repair_cost_usd")),
        })

    condition = str(raw.get("overall_condition", "")).lower()
    if condition not in ALLOWED_CONDITIONS:
        # Derive a sane fallback from detected damage.
        if any(d["severity"] == "severe" for d in damages):
            condition = "damaged"
        elif damages:
            condition = "fair"
        else:
            condition = "good"

    category = str(raw.get("vehicle_category", "")).lower()
    if category not in ALLOWED_CATEGORIES:
        category = "other"

    return {
        "vehicle_category": category,
        "in_scope": category in IN_SCOPE_CATEGORIES,
        "vehicle_identified": raw.get("vehicle_identified") or None,
        "overall_condition": condition,
        "damage_detected": bool(damages) or bool(raw.get("damage_detected")),
        "damage_count": len(damages),
        "damages": damages,
        "clean_panels": [str(p) for p in (raw.get("clean_panels") or []) if p],
        "image_quality_issues": [str(i) for i in (raw.get("image_quality_issues") or []) if i],
        "total_estimated_repair_cost_usd": _normalize_cost(raw.get("total_estimated_repair_cost_usd")),
        "summary": (str(raw["summary"]).strip() if raw.get("summary") else None),
    }


def analyze_listing_images(listing: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run vision damage detection over a listing's image URLs.

    Args:
        listing: dict with at least `id` and `images` (list of URLs); optional
                 year/make/model/trim used for context.

    Returns:
        Dict with keys: report (normalized JSON report), model, images_analyzed.

    Raises:
        ValueError: configuration problems, no usable images, or an
                    unparseable/empty model response.
    """
    images = [u for u in (listing.get("images") or []) if isinstance(u, str) and u.startswith(("http://", "https://"))]
    if not images:
        raise ValueError("Listing has no usable image URLs")
    images = images[:MAX_IMAGES_PER_LISTING]

    client = _get_client()

    content: List[Dict[str, Any]] = [{"type": "text", "text": _build_user_prompt(listing, len(images))}]
    for url in images:
        content.append({"type": "image_url", "image_url": {"url": url, "detail": "auto"}})

    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,   # low temperature for consistent inspection output
            max_tokens=1500,
        )
    except Exception as e:
        # Surface a clean, single-line error to the runner (URL fetch failures,
        # rate limits, etc.) — the runner records it per listing and moves on.
        raise ValueError(f"Vision API call failed: {e}")

    message_content = response.choices[0].message.content
    if not message_content:
        raise ValueError("Vision API returned empty response")

    try:
        raw = json.loads(message_content)
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse vision response as JSON: %.300s", message_content)
        raise ValueError(f"Failed to parse vision response: {e}")

    return {
        "report": _normalize_report(raw, len(images)),
        "model": VISION_MODEL,
        "images_analyzed": len(images),
    }
