# Vehicle Damage Detection Service
#
# Multi-stage vision pipeline (one listing in, one structured report out):
#
#   Stage 1  INSPECT  — each photo is analyzed in its OWN vision call (run in
#                       parallel): triage the view, check the vehicle is
#                       visible, list candidate damages with outlines.
#                       Per-image calls keep the model's attention on one
#                       photo — a single call with 8 photos dilutes it.
#   Stage 2  CLASSIFY — text-only call over the per-image findings: what
#                       vehicle was actually seen, does it match the listing,
#                       which category (passenger / light commercial / ...).
#   Stage 3  VERIFY   — every candidate damage gets a focused second vision
#                       call prompted to REFUTE it (decal? sticker? vent?
#                       reflection? shadow?). Only confirmed damage survives.
#   Stage 4  SYNTHESIZE — text-only call writes condition + summary from the
#                       verified findings; code applies hard guards (e.g.
#                       condition capped at "fair" without an exterior view).
#
# Pure service layer: no DB access here — persistence lives in the runner.

from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, List, Optional
import json
import logging
import re

from openai import OpenAI

from ..core.config import settings

logger = logging.getLogger(__name__)

# Vision model + image detail come from settings (env-overridable):
#   DAMAGE_VISION_MODEL  (default gpt-4o)  — detection quality lever
#   DAMAGE_VISION_DETAIL (default high)    — resolution lever
#   DAMAGE_MAX_IMAGES    (default 12)      — photos analyzed per listing
VISION_MODEL = settings.DAMAGE_VISION_MODEL
VISION_DETAIL = settings.DAMAGE_VISION_DETAIL if settings.DAMAGE_VISION_DETAIL in ("low", "high", "auto") else "high"
MAX_IMAGES_PER_LISTING = max(1, settings.DAMAGE_MAX_IMAGES)

# Bounded parallelism for the per-image / per-finding calls of ONE listing.
_MAX_PARALLEL_CALLS = 4
# Cap candidates sent to verification per image (defends cost on noisy output).
_MAX_CANDIDATES_PER_IMAGE = 6

ALLOWED_SEVERITIES = {"minor", "moderate", "severe"}
ALLOWED_CONDITIONS = {"excellent", "good", "fair", "poor", "damaged"}
ALLOWED_VIEWS = {
    "exterior_front", "exterior_rear", "exterior_left", "exterior_right",
    "exterior_other", "interior", "engine_bay", "trunk", "wheel_tire",
    "dashboard_odometer", "undercarriage", "document", "other",
}
ALLOWED_MATCH = {"match", "mismatch", "unverifiable"}
ALLOWED_CATEGORIES = {
    "passenger", "light_commercial",                       # in scope
    "heavy_commercial", "motorcycle", "rv_camper", "bus",  # out of scope
    "equipment", "trailer", "boat", "other",
}
IN_SCOPE_CATEGORIES = {"passenger", "light_commercial"}

_EXPECTED_EXTERIOR_VIEWS = ("exterior_front", "exterior_rear", "exterior_left", "exterior_right")

# When a listing has more photos than the cap, keep the most informative ones.
# Lower number = higher priority. EXTERIOR FOCUS: all exterior angles first,
# then ID-bearing shots (odometer/VIN stickers, documents with VIN/contact),
# interior last before junk.
_VIEW_PRIORITY = {
    "exterior_front": 0, "exterior_rear": 0, "exterior_left": 0, "exterior_right": 0,
    "exterior_other": 1,
    "wheel_tire": 2, "undercarriage": 2,
    "dashboard_odometer": 3,   # odometer + VIN plate often visible
    "document": 4,             # registration/window sticker: VIN, contact info
    "engine_bay": 5, "trunk": 5,
    "interior": 6,
    "other": 8,
}

# Things routinely mistaken for damage — every vision prompt names them.
_NOT_DAMAGE = (
    "racing decals, vinyl stripes, race number panels, sponsor stickers, "
    "wraps, badges, factory vents/scoops, body character lines, trim seams, "
    "panel gaps, tinted windows, reflections, shadows, dirt, water droplets, glare"
)

# The only kinds of visual evidence that justify reporting damage.
_DAMAGE_EVIDENCE = (
    "scratches, dents, cracks, deformation, broken components, paint loss, "
    "peeling/failed clear coat, or missing parts"
)

# Environmental artifacts paragraph injected into every inspection prompt.
_ARTIFACT_GUIDANCE = """The image may contain environmental artifacts including:
- Sunlight glare and overexposure
- Reflections from buildings, trees, people, and other vehicles
- Shadows and varying illumination
- Water, dust, dirt, or mud
- Camera distortion, blur, and compression artifacts
Carefully distinguish actual vehicle damage from these visual artifacts.
Report a finding as certainty "definite" only when confidence is high that the
observed feature is physical damage to the vehicle surface. If uncertain, set
certainty to "possible" and explain the reason in uncertainty_reason."""


def _get_client() -> OpenAI:
    if not settings.AI_ENABLED or not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key not configured")
    try:
        return OpenAI(api_key=settings.OPENAI_API_KEY)
    except Exception as e:
        logger.error("Error initializing OpenAI client: %s", e)
        raise ValueError(f"Failed to initialize OpenAI client: {e}")


def _is_reasoning_model(model: str) -> bool:
    """GPT-5 family and o-series are reasoning models with a different API
    contract (max_completion_tokens, fixed temperature, hidden reasoning
    tokens). The '-chat' variants are conventional chat models."""
    m = model.lower()
    return m.startswith(("gpt-5", "o3", "o4")) and "chat" not in m

# Hidden-reasoning headroom: a reasoning model spends output tokens thinking
# before emitting JSON; without this, the JSON gets truncated or comes back empty.
_REASONING_HEADROOM_TOKENS = 2000


def _json_vision_call(
    client: OpenAI,
    system: str,
    prompt: str,
    image_urls: Optional[List[str]] = None,
    max_tokens: int = 900,
    detail: Optional[str] = None,
) -> Dict[str, Any]:
    """One JSON-mode completion (optionally with images); raises ValueError.
    Handles both conventional (gpt-4o) and reasoning (gpt-5.x / o-series)
    model parameter contracts transparently."""
    content: Any = prompt
    if image_urls:
        content = [{"type": "text", "text": prompt}] + [
            {"type": "image_url", "image_url": {"url": u, "detail": detail or VISION_DETAIL}}
            for u in image_urls
        ]
    kwargs: Dict[str, Any] = {
        "model": VISION_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
        "response_format": {"type": "json_object"},
    }
    if _is_reasoning_model(VISION_MODEL):
        kwargs["max_completion_tokens"] = max_tokens + _REASONING_HEADROOM_TOKENS
        # Visual inspection needs looking, not deep deliberation — low effort
        # keeps latency/cost sane. Removed on retry if the model rejects it.
        kwargs["reasoning_effort"] = "low"
    else:
        kwargs["temperature"] = 0.2
        kwargs["max_tokens"] = max_tokens

    try:
        try:
            response = client.chat.completions.create(**kwargs)
        except Exception as e:
            # Older/newer model revisions occasionally reject specific params —
            # retry once without the optional ones before giving up.
            if "reasoning_effort" in kwargs and "reasoning" in str(e).lower():
                kwargs.pop("reasoning_effort")
                response = client.chat.completions.create(**kwargs)
            else:
                raise
    except Exception as e:
        raise ValueError(f"Vision API call failed: {e}")
    raw = response.choices[0].message.content
    if not raw:
        raise ValueError("Vision API returned empty response")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse vision response: {e}")


# --------------------------------------------------------------------------- #
# Normalization helpers
# --------------------------------------------------------------------------- #

def _clamp_confidence(value: Any) -> float:
    try:
        return max(0.0, min(1.0, float(value)))
    except (TypeError, ValueError):
        return 0.0


def _normalize_area_points(value: Any) -> Optional[List[Dict[str, float]]]:
    """Validate a damage outline: 3-8 points, coordinates clamped to [0, 1]."""
    if not isinstance(value, list):
        return None
    points: List[Dict[str, float]] = []
    for p in value[:8]:
        if not isinstance(p, dict):
            continue
        try:
            x = float(p.get("x"))
            y = float(p.get("y"))
        except (TypeError, ValueError):
            continue
        points.append({
            "x": round(max(0.0, min(1.0, x)), 4),
            "y": round(max(0.0, min(1.0, y)), 4),
        })
    if len(points) < 3:
        return None
    if len({(pt["x"], pt["y"]) for pt in points}) == 1:
        return None
    return points


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


# --------------------------------------------------------------------------- #
# Stage 0 — photo selection (only when the listing exceeds the image cap)
# --------------------------------------------------------------------------- #

_PRETRIAGE_SYSTEM = (
    "You classify vehicle listing photos by view. "
    "Always respond with a single valid JSON object and nothing else."
)


def _select_images(client: OpenAI, images: List[str]) -> List[tuple]:
    """Pick the MAX_IMAGES_PER_LISTING most informative photos.

    Returns (original_index, url) pairs — original indexes are preserved
    because damage markers are drawn on the listing's full image array.
    Under the cap: everything is analyzed and this stage is skipped entirely.
    Over the cap: one cheap LOW-detail call classifies every photo's view,
    then photos are kept by view priority (exterior shots first). Falls back
    to the first N photos if the triage call fails.
    """
    pairs = list(enumerate(images))
    if len(pairs) <= MAX_IMAGES_PER_LISTING:
        return pairs

    # Classify in batches: huge listings (50+ photos) overflow a single
    # response, and a truncated JSON would throw the whole triage away.
    BATCH = 16
    views_options = " | ".join(f'"{v}"' for v in sorted(ALLOWED_VIEWS))

    def _triage_batch(batch: List[tuple]) -> List[str]:
        prompt = (
            f"Classify the view of each of the {len(batch)} attached vehicle listing "
            f"photos, in order. Allowed views: {views_options}.\n"
            f'Respond with EXACTLY: {{"views": ["exterior_front", "interior", ...]}} '
            f"({len(batch)} entries, one per photo in order)."
        )
        raw = _json_vision_call(
            client, _PRETRIAGE_SYSTEM, prompt,
            image_urls=[u for _, u in batch],
            max_tokens=60 + 12 * len(batch),  # ~12 tokens per view label
            detail="low",
        )
        batch_views = raw.get("views")
        if not isinstance(batch_views, list) or len(batch_views) != len(batch):
            raise ValueError(f"expected {len(batch)} views, got {len(batch_views) if isinstance(batch_views, list) else type(batch_views)}")
        return [str(v).lower() for v in batch_views]

    try:
        batches = [pairs[i:i + BATCH] for i in range(0, len(pairs), BATCH)]
        with ThreadPoolExecutor(max_workers=_MAX_PARALLEL_CALLS) as pool:
            views = [v for batch_result in pool.map(_triage_batch, batches) for v in batch_result]
    except Exception as e:
        logger.warning("Photo pre-triage failed (%s) — falling back to first %s photos",
                       e, MAX_IMAGES_PER_LISTING)
        return pairs[:MAX_IMAGES_PER_LISTING]

    def priority(item):
        (idx, _url), view = item
        view = str(view).lower()
        return (_VIEW_PRIORITY.get(view, 8), idx)  # stable: earlier photo wins ties

    ranked = sorted(zip(pairs, views), key=priority)
    selected = [pair for pair, _view in ranked[:MAX_IMAGES_PER_LISTING]]
    selected.sort(key=lambda p: p[0])  # process in original photo order
    dropped = [pair[0] for pair, _view in ranked[MAX_IMAGES_PER_LISTING:]]
    logger.info("Photo selection: analyzing %s of %s (dropped indexes %s)",
                len(selected), len(pairs), dropped)
    return selected


# --------------------------------------------------------------------------- #
# Stage 1 — per-image inspection
# --------------------------------------------------------------------------- #

def _parse_damage_item(d: Any, image_index: int) -> Optional[Dict[str, Any]]:
    """Validate one model-reported damage into the canonical finding shape."""
    if not isinstance(d, dict) or not d.get("part"):
        return None
    severity = str(d.get("severity", "")).lower()
    certainty = str(d.get("certainty", "")).lower()
    return {
        "part": str(d["part"]).strip().lower(),
        "damage_type": str(d.get("damage_type", "other")).strip().lower(),
        "severity": severity if severity in ALLOWED_SEVERITIES else "minor",
        "location": (str(d["location"]).strip() if d.get("location") else None),
        "description": (str(d["description"]).strip() if d.get("description") else None),
        "reason": (str(d["reason"]).strip() if d.get("reason") else None),  # visual evidence
        "image_index": image_index,
        "confidence": _clamp_confidence(d.get("confidence")),
        "certainty": certainty if certainty in ("definite", "possible") else "definite",
        "uncertainty_reason": (str(d["uncertainty_reason"]).strip() if d.get("uncertainty_reason") else None),
        "area_points": _normalize_area_points(d.get("area_points")),
        "estimated_repair_cost_usd": _normalize_cost(d.get("estimated_repair_cost_usd")),
    }


_INSPECT_SYSTEM = (
    "You are a vehicle damage detection assistant for a used-car dealership. "
    "You inspect ONE photo at a time and identify VISIBLE damage only. "
    f"NOT damage: {_NOT_DAMAGE}. "
    "Do not guess hidden damage. If uncertain, include the finding with low "
    "confidence rather than omitting it. "
    "Always respond with a single valid JSON object and nothing else."
)


def _inspect_image(client: OpenAI, url: str, index: int, vehicle_desc: str) -> Dict[str, Any]:
    prompt = f"""Analyze this vehicle image step by step.
This is photo {index} of a vehicle listing (listed vehicle: {vehicle_desc}).

STEP 1 — First identify the vehicle view and visible vehicle parts.
   vehicle_view is one of:
   "exterior_front" | "exterior_rear" | "exterior_left" | "exterior_right" |
   "exterior_other" | "interior" | "engine_bay" | "trunk" | "wheel_tire" |
   "dashboard_odometer" | "undercarriage" | "document" | "other"
   Also note whether a vehicle is visible and briefly describe the vehicle you
   actually SEE (make/model/color/notable features like racing livery).

STEP 2 — Then evaluate the image itself: lighting, shadows, reflections,
   glare, dirt, blur, and camera angle. Rate image_quality and list the
   specific issues that could mask or mimic damage.
{_ARTIFACT_GUIDANCE}

STEP 3 — Inspect each visible vehicle part SEPARATELY, one at a time:
   front bumper, hood, windshield, roof, EACH headlight and taillight
   separately, grille, each visible door/fender/quarter panel, mirrors, glass,
   wheels/rims, trim (or seats/dash/console for interior shots). Report EACH
   damaged part as its own finding — two fogged headlights are TWO findings.
   EXTERIOR damage is the priority.

STEP 4 — Do NOT classify reflections, shadows, body lines, panel gaps, dirt,
   or glare as damage. Also not damage: {_NOT_DAMAGE}.

STEP 5 — Only report damage when there is CLEAR VISUAL EVIDENCE of
   {_DAMAGE_EVIDENCE}. State that evidence in the "reason" field for every
   finding. If uncertain, set certainty to "possible", explain the ambiguity
   in uncertainty_reason, and set needs_human_review accordingly.
   Severity rubric:
   - "minor": cosmetic, small, barely noticeable (light scratch, door ding)
   - "moderate": obvious but localized (dent, scratch through paint, cracked light)
   - "severe": large-area or structural (panel-wide paint/clear-coat failure or
     peeling, collision damage, missing parts, broken glass)

STEP 6 — EXTRACT IDENTIFICATION visible in THIS photo, if any:
   vin (windshield plate, door-jamb sticker, documents — transcribe EXACTLY),
   license_plate, phone_numbers, contact_text. Never guess characters.

For each damage provide area_points: 3-8 points outlining the damaged area as
fractions of the image (x: 0.0 left to 1.0 right, y: 0.0 top to 1.0 bottom).
The outline MUST cover the FULL extent of the damage — if peeling paint spans
half the hood, the outline spans half the hood, not just one spot. It is drawn
on the photo for the buyer; an undersized outline misrepresents the damage.

Return JSON with EXACTLY this shape:
{{
  "vehicle_view": "exterior_front",
  "vehicle_visible": true,
  "vehicle_seen": "yellow Chevrolet Corvette with racing decals" or null,
  "image_quality": {{
    "rating": "good" | "fair" | "poor",
    "issues": ["strong glare on hood", "slight motion blur"]
  }},
  "visible_parts": ["front bumper", "hood", "left headlight", "..."],
  "damaged_parts": [
    {{
      "part": "front bumper",
      "damage_type": "dent" | "scratch" | "crack" | "rust" | "paint damage" | "deformation" | "missing part" | "broken glass" | "hail damage" | "collision damage" | "wear" | "stain/tear" | "other",
      "severity": "minor" | "moderate" | "severe",
      "location": "front left",
      "description": "1-2 factual sentences",
      "reason": "the clear visual evidence justifying this as damage",
      "confidence": 0.0-1.0,
      "certainty": "definite" | "possible",
      "uncertainty_reason": "why this might be an artifact, or null when definite",
      "area_points": [{{"x": 0.32, "y": 0.55}}, {{"x": 0.41, "y": 0.52}}, {{"x": 0.38, "y": 0.62}}],
      "estimated_repair_cost_usd": {{"low": 150, "high": 400}} or null
    }}
  ],
  "needs_human_review": true | false,
  "extracted": {{
    "vin": "1G1YY26E785100001" or null,
    "license_plate": "ABC1234" or null,
    "phone_numbers": ["555-123-4567"],
    "contact_text": "call Mike" or null
  }}
}}
If no damage is visible, return an empty damaged_parts array."""

    raw = _json_vision_call(client, _INSPECT_SYSTEM, prompt, [url], max_tokens=1200)

    view = str(raw.get("vehicle_view") or raw.get("view") or "").lower()
    damages = []
    for d in (raw.get("damaged_parts") or raw.get("damages") or [])[:_MAX_CANDIDATES_PER_IMAGE]:
        parsed = _parse_damage_item(d, index)
        if parsed:
            damages.append(parsed)

    quality = raw.get("image_quality") if isinstance(raw.get("image_quality"), dict) else {}
    quality_rating = str(quality.get("rating", "")).lower()
    if quality_rating not in ("good", "fair", "poor"):
        quality_rating = "fair"
    quality_issues = [str(q) for q in (quality.get("issues") or []) if q][:5]

    visible_parts = [str(p).strip().lower() for p in (raw.get("visible_parts") or []) if p][:20]
    damaged_names = {d["part"] for d in damages}

    ext = raw.get("extracted") if isinstance(raw.get("extracted"), dict) else {}
    return {
        "index": index,
        "view": view if view in ALLOWED_VIEWS else "other",
        "vehicle_visible": bool(raw.get("vehicle_visible")),
        "vehicle_seen": (str(raw["vehicle_seen"]).strip() if raw.get("vehicle_seen") else None),
        "image_quality": quality_rating,
        "visible_parts": visible_parts,
        "damages": damages,
        # Clean = inspected and explicitly not damaged in this photo.
        "clean_panels": [p for p in visible_parts if p not in damaged_names][:10],
        "quality_issues": quality_issues,
        "needs_human_review": bool(raw.get("needs_human_review"))
            or quality_rating == "poor"
            or any(d["certainty"] == "possible" for d in damages),
        "extracted": {
            "vin": (str(ext["vin"]).strip() if ext.get("vin") else None),
            "license_plate": (str(ext["license_plate"]).strip() if ext.get("license_plate") else None),
            "phone_numbers": [str(p).strip() for p in (ext.get("phone_numbers") or []) if p][:3],
            "contact_text": (str(ext["contact_text"]).strip() if ext.get("contact_text") else None),
        },
        "error": None,
    }


# 17 chars, no I/O/Q — standard VIN alphabet.
_VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")


def _clean_id(value: Optional[str]) -> Optional[str]:
    """Uppercase and strip separators from an extracted VIN/plate."""
    if not value:
        return None
    cleaned = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    return cleaned or None


def _aggregate_extractions(
    inspections: List[Dict[str, Any]], listing: Dict[str, Any],
) -> Dict[str, Any]:
    """Merge per-photo extractions and cross-check against the listing record."""
    vins: List[str] = []
    plates: List[str] = []
    phones: List[str] = []
    contacts: List[str] = []
    for i in inspections:
        e = i.get("extracted") or {}
        if e.get("vin"):
            vins.append(str(e["vin"]))
        if e.get("license_plate"):
            plates.append(str(e["license_plate"]))
        for p in e.get("phone_numbers") or []:
            if p not in phones:
                phones.append(p)
        if e.get("contact_text") and e["contact_text"] not in contacts:
            contacts.append(e["contact_text"])

    # Prefer the first fully valid VIN; keep an invalid transcription as raw.
    vin = next((v for v in (_clean_id(x) for x in vins) if v and _VIN_RE.match(v)), None)
    vin_raw = vins[0] if vins and not vin else None
    plate = _clean_id(plates[0]) if plates else None

    listing_vin = _clean_id(listing.get("vin"))
    listing_lpn = _clean_id(listing.get("lpn"))

    return {
        "vin": vin,
        "vin_raw": vin_raw,                       # readable but failed validation
        "vin_matches_listing": (vin == listing_vin) if vin and listing_vin else None,
        "license_plate": plate,
        "plate_matches_listing": (plate == listing_lpn) if plate and listing_lpn else None,
        "phone_numbers": phones[:5],
        "contact_text": contacts[:3],
    }


def _outline_center(points: Optional[List[Dict[str, float]]]) -> Optional[tuple]:
    if not points:
        return None
    return (
        sum(p["x"] for p in points) / len(points),
        sum(p["y"] for p in points) / len(points),
    )


def _is_duplicate(candidate: Dict[str, Any], existing: List[Dict[str, Any]]) -> bool:
    """Same image + same part, or same part-type with nearby outline center."""
    for d in existing:
        if d["image_index"] != candidate["image_index"]:
            continue
        if d["part"] == candidate["part"] and d["damage_type"] == candidate["damage_type"]:
            return True
        c1, c2 = _outline_center(d.get("area_points")), _outline_center(candidate.get("area_points"))
        if c1 and c2 and abs(c1[0] - c2[0]) < 0.12 and abs(c1[1] - c2[1]) < 0.12:
            return True
    return False


def _find_additional_damage(
    client: OpenAI, url: str, index: int, found: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Recall pass for exterior photos: a fresh look that knows what was
    already found and hunts ONLY for what the first pass missed."""
    found_lines = [
        f"- {d['part']}: {d['damage_type']} ({d['severity']})" for d in found
    ] or ["(nothing found yet)"]
    prompt = f"""A first inspection of this photo already found:
{chr(10).join(found_lines)}

Look again CAREFULLY for damage the first inspection MISSED. Check each region
it commonly overlooks: the OTHER headlight/taillight, roof surface (scuffs,
oxidation), hood paint condition, lower bumper corners, rocker panels, mirror
caps, window trim, each wheel. Remember: {_NOT_DAMAGE} are NOT damage.

{_ARTIFACT_GUIDANCE}

Report ONLY newly found damage (empty array if the first pass was complete),
in EXACTLY this JSON shape:
{{
  "damages": [
    {{
      "part": "...", "damage_type": "...", "severity": "minor|moderate|severe",
      "location": "...", "description": "...", "confidence": 0.0-1.0,
      "certainty": "definite" | "possible",
      "uncertainty_reason": "... or null",
      "area_points": [{{"x":0.3,"y":0.5}}, ...] covering the FULL extent,
      "estimated_repair_cost_usd": {{"low": 0, "high": 0}} or null
    }}
  ]
}}"""
    try:
        raw = _json_vision_call(client, _INSPECT_SYSTEM, prompt, [url], max_tokens=900)
    except ValueError as e:
        logger.warning("Recall pass failed for image %s: %s", index, e)
        return []
    extra = []
    for d in (raw.get("damages") or [])[:_MAX_CANDIDATES_PER_IMAGE]:
        parsed = _parse_damage_item(d, index)
        if parsed:
            extra.append(parsed)
    return extra


# --------------------------------------------------------------------------- #
# Stage 2 — vehicle classification (text-only over per-image findings)
# --------------------------------------------------------------------------- #

_CLASSIFY_SYSTEM = (
    "You are a vehicle identification analyst. "
    "Always respond with a single valid JSON object and nothing else."
)


def _classify_vehicle(client: OpenAI, vehicle_desc: str, inspections: List[Dict[str, Any]]) -> Dict[str, Any]:
    seen = [
        f"photo {i['index']} ({i['view']}): {i['vehicle_seen'] or 'no vehicle described'}"
        for i in inspections if i["vehicle_visible"]
    ]
    prompt = f"""Listing claims the vehicle is: {vehicle_desc}

Independent per-photo observations:
{chr(10).join(seen) if seen else '(no photo shows a vehicle)'}

Decide:
- vehicle_detected: was a vehicle actually seen in the photos?
- vehicle_identified: short description of the vehicle actually seen, or null
- vehicle_match: "match" (consistent with the listing), "mismatch" (clearly a
  different vehicle), or "unverifiable"
- vehicle_category: "passenger" (cars, SUVs, minivans, consumer pickups) |
  "light_commercial" (cargo vans, utes, light box trucks up to ~3.5t) |
  "heavy_commercial" | "motorcycle" | "rv_camper" | "bus" | "equipment" |
  "trailer" | "boat" | "other"

Respond with EXACTLY:
{{"vehicle_detected": true, "vehicle_identified": "...", "vehicle_match": "match", "vehicle_category": "passenger"}}"""

    try:
        raw = _json_vision_call(client, _CLASSIFY_SYSTEM, prompt, None, max_tokens=200)
    except ValueError:
        # Fall back to what the per-image stage saw — never fail the listing here.
        raw = {}
    category = str(raw.get("vehicle_category", "")).lower()
    match = str(raw.get("vehicle_match", "")).lower()
    return {
        "vehicle_detected": bool(raw.get("vehicle_detected")) or any(i["vehicle_visible"] for i in inspections),
        "vehicle_identified": (str(raw["vehicle_identified"]).strip() if raw.get("vehicle_identified") else None),
        "vehicle_match": match if match in ALLOWED_MATCH else "unverifiable",
        "vehicle_category": category if category in ALLOWED_CATEGORIES else "other",
    }


# --------------------------------------------------------------------------- #
# Stage 3 — adversarial verification of each candidate damage
# --------------------------------------------------------------------------- #

_VERIFY_SYSTEM = (
    "You are a skeptical vehicle damage auditor. You audit damage claims "
    "against the photo and must distinguish physical damage from visual "
    f"artifacts. Common false positives: {_NOT_DAMAGE}; plus sunlight glare, "
    "overexposure, reflections of buildings/trees/people/vehicles, shadows, "
    "water, dust, mud, camera blur and compression artifacts. "
    "Always respond with a single valid JSON object and nothing else."
)


def _verify_damage(client: OpenAI, url: str, candidate: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Second, focused look at one claimed damage.

    Three-way verdict:
      confirmed -> kept with certainty "definite"
      possible  -> kept with certainty "possible" + the uncertainty reason
      refuted   -> dropped (clearly an artifact / nothing there)
    Returns None when refuted; on API failure the candidate is kept flagged.
    """
    region = json.dumps(candidate.get("area_points") or [])
    prompt = f"""A previous inspection of this photo claimed:
- part: {candidate['part']}
- damage_type: {candidate['damage_type']}
- severity: {candidate['severity']}
- description: {candidate.get('description') or '(none)'}
- claimed region (fractions of image, x right, y down): {region}

Look at that region closely and decide:
- "confirmed": clearly real physical damage to the vehicle surface
- "possible": could be damage, but might be an artifact (glare, reflection,
  shadow, dirt, blur) — explain which artifact and why it is ambiguous
- "refuted": clearly NOT damage (artifact, decal, sticker, vent, nothing there)

Respond with EXACTLY:
{{
  "verdict": "confirmed" | "possible" | "refuted",
  "reason": "1 sentence — what you actually see there",
  "severity": "minor" | "moderate" | "severe",
  "confidence": 0.0-1.0,
  "refined_area_points": [{{"x":0.3,"y":0.5}}, ...] or null
}}
If confirmed or possible, refine the outline to cover the damage's FULL extent."""

    try:
        raw = _json_vision_call(client, _VERIFY_SYSTEM, prompt, [url], max_tokens=400)
    except ValueError as e:
        # Verification unavailable — keep the candidate but flag it, so a
        # transient API error doesn't silently erase findings.
        logger.warning("Damage verification failed for %s: %s", candidate["part"], e)
        return {**candidate, "verification": {"verdict": None, "reason": "verification call failed"}}

    verdict = str(raw.get("verdict", "")).lower()
    if verdict not in ("confirmed", "possible"):
        logger.info("Damage refuted (%s): %s", candidate["part"], raw.get("reason"))
        return None

    severity = str(raw.get("severity", "")).lower()
    refined = _normalize_area_points(raw.get("refined_area_points"))
    reason = (str(raw["reason"]).strip() if raw.get("reason") else None)
    return {
        **candidate,
        "severity": severity if severity in ALLOWED_SEVERITIES else candidate["severity"],
        "confidence": _clamp_confidence(raw.get("confidence")) or candidate["confidence"],
        # Verification can only downgrade certainty, never upgrade a "possible"
        # first-pass finding to definite sight unseen by the original inspector.
        "certainty": "definite" if (verdict == "confirmed" and candidate.get("certainty") == "definite") else "possible",
        "uncertainty_reason": candidate.get("uncertainty_reason") if verdict == "confirmed" else (reason or candidate.get("uncertainty_reason")),
        "area_points": refined or candidate.get("area_points"),
        "verification": {"verdict": verdict, "reason": reason},
    }


# --------------------------------------------------------------------------- #
# Stage 4 — synthesis (text-only)
# --------------------------------------------------------------------------- #

_SYNTH_SYSTEM = (
    "You are a vehicle condition report writer for a used-car dealership. "
    "Always respond with a single valid JSON object and nothing else."
)


def _synthesize(
    client: OpenAI,
    vehicle: Dict[str, Any],
    inspections: List[Dict[str, Any]],
    damages: List[Dict[str, Any]],
    missing_views: List[str],
) -> Dict[str, Any]:
    views = ", ".join(f"photo {i['index']}={i['view']}" for i in inspections)
    dmg_lines = [
        f"- {d['part']}: {d['damage_type']} ({d['severity']}, confidence {d['confidence']:.2f})"
        + (f" [POSSIBLE — {d.get('uncertainty_reason') or 'uncertain'}]" if d.get("certainty") == "possible" else "")
        for d in damages
    ] or ["(no confirmed damage)"]
    prompt = f"""Write the final assessment for this vehicle listing.

Vehicle seen: {vehicle.get('vehicle_identified') or 'unknown'} (match vs listing: {vehicle['vehicle_match']})
Photo coverage: {views}
Missing exterior views: {', '.join(missing_views) or 'none'}
Confirmed damage:
{chr(10).join(dmg_lines)}

Respond with EXACTLY:
{{
  "overall_condition": "excellent" | "good" | "fair" | "poor" | "damaged",
  "summary": "2-3 factual sentences: vehicle, confirmed damage, coverage limits"
}}
Never rate better than "fair" when exterior views are missing."""

    try:
        raw = _json_vision_call(client, _SYNTH_SYSTEM, prompt, None, max_tokens=250)
    except ValueError:
        raw = {}
    condition = str(raw.get("overall_condition", "")).lower()
    if condition not in ALLOWED_CONDITIONS:
        # Fallback derives from DEFINITE findings only — possible-damage
        # observations should not tank the condition on their own.
        definite = [d for d in damages if d.get("certainty") != "possible"]
        if any(d["severity"] == "severe" for d in definite):
            condition = "damaged"
        elif definite:
            condition = "fair"
        else:
            condition = "good"
    return {
        "overall_condition": condition,
        "summary": (str(raw["summary"]).strip() if raw.get("summary") else None),
    }


# --------------------------------------------------------------------------- #
# Public entry point (same signature/report schema as before)
# --------------------------------------------------------------------------- #

def analyze_listing_images(listing: Dict[str, Any]) -> Dict[str, Any]:
    """
    Multi-stage damage analysis over a listing's image URLs.

    Returns: {report, model, images_analyzed}. Raises ValueError on
    configuration problems, no usable images, or total inspection failure.
    """
    images = [u for u in (listing.get("images") or []) if isinstance(u, str) and u.startswith(("http://", "https://"))]
    if not images:
        raise ValueError("Listing has no usable image URLs")

    client = _get_client()
    vehicle_desc = " ".join(
        str(listing.get(k)) for k in ("year", "make", "model", "trim") if listing.get(k)
    ) or "Unknown vehicle"

    # Stage 0 — when over the cap, keep the most informative photos (exterior
    # first). Indexes stay ORIGINAL so damage markers land on the right photo.
    selected = _select_images(client, images)
    url_by_index = dict(selected)

    # Stage 1 — inspect every selected photo in parallel.
    def _safe_inspect(pair):
        idx, url = pair
        try:
            return _inspect_image(client, url, idx, vehicle_desc)
        except ValueError as e:
            logger.warning("Image %s inspection failed: %s", idx, e)
            return {"index": idx, "view": "other", "vehicle_visible": False,
                    "vehicle_seen": None, "image_quality": "poor",
                    "visible_parts": [], "damages": [], "clean_panels": [],
                    "quality_issues": [], "needs_human_review": True,
                    "extracted": {"vin": None, "license_plate": None,
                                  "phone_numbers": [], "contact_text": None},
                    "error": str(e)[:200]}

    with ThreadPoolExecutor(max_workers=_MAX_PARALLEL_CALLS) as pool:
        inspections = list(pool.map(_safe_inspect, selected))

    failed = [i for i in inspections if i["error"]]
    if len(failed) == len(inspections):
        raise ValueError(f"All image inspections failed (first error: {failed[0]['error']})")

    # Stage 2 — what vehicle is this, and is it in scope?
    vehicle = _classify_vehicle(client, vehicle_desc, inspections)
    in_scope = vehicle["vehicle_category"] in IN_SCOPE_CATEGORIES and vehicle["vehicle_detected"]

    # Stage 2b — recall pass on exterior photos: a second look that hunts only
    # for damage the first pass missed (other headlight, roof, lower corners...).
    if in_scope:
        exterior = [
            i for i in inspections
            if i["view"].startswith("exterior") and i["vehicle_visible"] and not i["error"]
        ]

        def _recall(i):
            return _find_additional_damage(client, url_by_index[i["index"]], i["index"], i["damages"])

        if exterior:
            with ThreadPoolExecutor(max_workers=_MAX_PARALLEL_CALLS) as pool:
                extra_lists = list(pool.map(_recall, exterior))
            all_known = [d for i in inspections for d in i["damages"]]
            for insp, extras in zip(exterior, extra_lists):
                for extra in extras:
                    if not _is_duplicate(extra, all_known):
                        insp["damages"].append(extra)
                        all_known.append(extra)
                        logger.info("Recall pass added: %s on image %s", extra["part"], extra["image_index"])

    # Stage 3 — adversarially verify candidates (skip for out-of-scope vehicles).
    confirmed: List[Dict[str, Any]] = []
    if in_scope:
        candidates = [(url_by_index[d["image_index"]], d) for i in inspections for d in i["damages"]]
        if candidates:
            with ThreadPoolExecutor(max_workers=_MAX_PARALLEL_CALLS) as pool:
                results = list(pool.map(lambda c: _verify_damage(client, c[0], c[1]), candidates))
            confirmed = [r for r in results if r is not None]

    # Coverage facts computed in code, not trusted from the model.
    exterior_seen = any(
        i["view"].startswith("exterior") and i["vehicle_visible"] for i in inspections
    )
    present_views = {i["view"] for i in inspections if i["vehicle_visible"]}
    missing_views = [v for v in _EXPECTED_EXTERIOR_VIEWS if v not in present_views]

    # Stage 4 — condition + summary.
    synthesis = _synthesize(client, vehicle, inspections, confirmed, missing_views)
    condition = synthesis["overall_condition"]
    if inspections and not exterior_seen and condition in ("excellent", "good"):
        condition = "fair"  # hard guard: partial coverage can't be rated clean

    # Total repair estimate summed in code from per-damage estimates.
    costs = [d["estimated_repair_cost_usd"] for d in confirmed if d.get("estimated_repair_cost_usd")]
    total_cost = (
        {"low": round(sum(c["low"] for c in costs), 2), "high": round(sum(c["high"] for c in costs), 2)}
        if costs else None
    )

    quality_issues = [q for i in inspections for q in i["quality_issues"]]
    quality_issues += [f"photo {i['index']} could not be analyzed" for i in failed]
    if len(images) > len(selected):
        skipped_idx = sorted(set(range(len(images))) - set(url_by_index))
        quality_issues.append(
            f"{len(images) - len(selected)} of {len(images)} photos not analyzed "
            f"(image cap {MAX_IMAGES_PER_LISTING}; lowest-priority views dropped: "
            f"indexes {skipped_idx})"
        )

    report = {
        "images": [
            {
                "index": i["index"],
                "view": i["view"],
                "vehicle_visible": i["vehicle_visible"],
                "image_quality": i.get("image_quality", "fair"),
                "visible_parts": i.get("visible_parts", []),
                "needs_human_review": i.get("needs_human_review", False),
            }
            for i in inspections
        ],
        # True when any photo is low quality / ambiguous, any finding is only
        # "possible", or the vehicle doesn't match the listing.
        "needs_human_review": (
            any(i.get("needs_human_review") for i in inspections)
            or any(d.get("certainty") == "possible" for d in confirmed)
            or vehicle["vehicle_match"] == "mismatch"
        ),
        "vehicle_detected": vehicle["vehicle_detected"],
        "vehicle_match": vehicle["vehicle_match"],
        "exterior_seen": exterior_seen,
        "missing_views": missing_views,
        "vehicle_category": vehicle["vehicle_category"],
        "in_scope": in_scope,
        "vehicle_identified": vehicle["vehicle_identified"],
        "extracted": _aggregate_extractions(inspections, listing),
        "overall_condition": condition,
        "damage_detected": any(d.get("certainty") != "possible" for d in confirmed),
        "damage_count": sum(1 for d in confirmed if d.get("certainty") != "possible"),
        "possible_damage_count": sum(1 for d in confirmed if d.get("certainty") == "possible"),
        "damages": confirmed,  # both tiers; each finding carries its certainty
        "clean_panels": sorted({p for i in inspections for p in i["clean_panels"]})[:15],
        "image_quality_issues": quality_issues[:10],
        "total_estimated_repair_cost_usd": total_cost,
        "summary": synthesis["summary"],
    }
    return {
        "report": report,
        "model": VISION_MODEL,
        "images_analyzed": len(selected) - len(failed),
    }
