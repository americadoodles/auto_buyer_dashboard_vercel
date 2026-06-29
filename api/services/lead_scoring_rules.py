# Lead Scoring rubric — deterministic rule engine (no AI).
#
# Replaces a freeform LLM 0-100 score with a fixed-point buy/no-buy rubric.
# Every point value and every hard "deal killer" block must be exact and
# auditable (this drives real buy/no-buy decisions), so this is plain Python
# over real columns — never an LLM guess.
#
# Factors with no backing data anywhere in the schema (seller response time,
# buyer-to-listing distance, mods/receipts evidence, loan payoff balance,
# odometer-rollback detection, "won't share VIN" signals, manufacturer-rebate
# flags, competition/view-count, segment demand) are never scored — they are
# always reported under `missing_factors` instead of being guessed at.

import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

# An evaluator returns (triggered, reason) — reason is shown whether triggered
# or not, for audit. A factor whose weight varies with the data (e.g. a tiered
# dollar penalty) may instead return (triggered, reason, points): when present,
# `points` overrides the factor's nominal weight for this evaluation.
Evaluator = Callable[
    [Dict[str, Any]],
    Tuple[bool, Optional[str]],  # or Tuple[bool, Optional[str], int]
]

VERDICT_BUYABLE = "buyable"
VERDICT_MARGINAL = "marginal"
VERDICT_NOT_BUYABLE = "not_buyable"
VERDICT_DEAL_KILLER = "deal_killer"

DEAL_KILLER_POINTS = -999

# total_points >= this -> buyable; >= MARGINAL_MIN -> marginal; else not_buyable.
BUYABLE_MIN = 40
MARGINAL_MIN = 15

# Title-status keywords that brand a vehicle salvage/rebuilt/flood/theft —
# stands in for BOTH rubric items #11 (salvage history) and #13 (bad
# Carfax/AutoCheck: severe accidents, theft), since both only have this one
# free-text field as a real signal in this schema.
_TITLE_RED_FLAG_KEYWORDS = (
    "salvage", "rebuilt", "reconstructed", "flood", "fire damage", "theft",
    "junk", "total loss", "frame damage", "structural damage", "lemon",
)

_RARE_TRIM_KEYWORDS = (
    "z06", "zr1", "blackwing", "gt350", "gt500", "trd pro", "raptor",
    "hellcat", "demon", "redeye", "trackhawk", "trackbrawn", "type r",
    "type-r", "sti", "wrx", "m2", "m3", "m4", "m5", "m8", "amg", "rs",
    "srt", "shelby", "z71", "zl1", "scat pack", "1le", "performance pkg",
    "track pack", "competition",
)

_BASE_TRIM_KEYWORDS = (
    "base", "l", "lx", "le", "s", "se", "value", "work truck",
    "tradesman", "standard",
)

_DESIRABLE_OPTION_KEYWORDS = (
    "sunroof", "moonroof", "navigation", "nav system", "leather", "premium",
    "performance package", "performance pkg", "tech package", "tech pkg",
    "technology package", "heated seat", "cooled seat", "panoramic",
    "premium audio", "adaptive cruise",
)

_SUNROOF_KEYWORDS = ("sunroof", "moonroof", "panoramic")

_TRUCK_BODY_STYLE_KEYWORDS = ("truck", "pickup")

_4X4_KEYWORDS = ("4x4", "4wd", "awd", "all-wheel", "four-wheel")

_CONDITION_POOR_VALUES = {"poor", "damaged"}
_CONDITION_GOOD_VALUES = {"excellent", "good"}

# How "young" a FB account must be (days since joining) to count as a
# shady-seller signal on its own.
_NEW_ACCOUNT_DAYS = 90


def _contains_any(haystack: Optional[str], keywords: Tuple[str, ...]) -> Optional[str]:
    """Return the first keyword found in haystack as a whole word/phrase
    (case-insensitive, word-boundary match — a plain substring check would
    let short tokens like "se" false-positive inside "SEL"), or None."""
    if not haystack:
        return None
    low = haystack.lower()
    for kw in keywords:
        if re.search(rf"\b{re.escape(kw.strip())}\b", low):
            return kw.strip()
    return None


def _features_contain_any(features: Any, keywords: Tuple[str, ...]) -> Optional[str]:
    if not isinstance(features, list):
        return None
    joined = " ".join(str(f) for f in features).lower()
    return _contains_any(joined, keywords)


# --------------------------------------------------------------------------- #
# Deal killers
# --------------------------------------------------------------------------- #

def _check_title_red_flag(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    hit = _contains_any(ctx.get("vehicle_title_status"), _TITLE_RED_FLAG_KEYWORDS)
    if hit:
        return True, f"title status contains '{hit}' ({ctx.get('vehicle_title_status')!r})"
    return False, None


# --------------------------------------------------------------------------- #
# Scored factors
# --------------------------------------------------------------------------- #

def _eval_mmr_delta(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    mmr = ctx.get("mmr")
    price = ctx.get("price")
    if not mmr or not price:
        return False, "no MMR or price data"
    pct = (price - mmr) / mmr * 100
    if pct <= -1:
        return True, f"{abs(pct):.0f}% below MMR (${mmr - price:,.0f} under)"
    return False, f"{pct:+.0f}% vs MMR"


def _eval_asking_too_much(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    mmr = ctx.get("mmr")
    price = ctx.get("price")
    if not mmr or not price:
        return False, "no MMR or price data"
    pct = (price - mmr) / mmr * 100
    if pct >= 1:
        return True, f"{pct:.0f}% above MMR (${price - mmr:,.0f} over)"
    return False, f"{pct:+.0f}% vs MMR"


def _eval_clean_title(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    if ctx.get("clean_title") is True:
        return True, None
    return False, "clean_title not confirmed"


def _eval_rare_trim(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    hit = _contains_any(ctx.get("trim"), _RARE_TRIM_KEYWORDS)
    if hit:
        return True, f"trim {ctx.get('trim')!r} matches rare-trim keyword '{hit}'"
    return False, f"trim {ctx.get('trim')!r} not in rare-trim list"


def _eval_base_trim(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    trim = ctx.get("trim")
    hit = _contains_any(trim, _BASE_TRIM_KEYWORDS)
    if hit or not trim:
        return True, f"trim {trim!r} looks like a base trim"
    return False, f"trim {trim!r} not a base trim"


def _eval_low_miles_for_year(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    miles, year = ctx.get("miles"), ctx.get("year")
    current_year = ctx.get("current_year")
    if not miles or not year or not current_year:
        return False, "no miles/year data"
    age_years = max(1, current_year - int(year))
    expected = age_years * 12_000
    if miles < 0.7 * expected:
        return True, f"{miles:,} mi vs ~{expected:,} mi expected for a {age_years}-yr-old vehicle"
    return False, f"{miles:,} mi vs ~{expected:,} mi expected"


def _eval_one_owner(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    owners = ctx.get("vehicle_number_of_owners")
    if owners == 1:
        return True, "1 owner on record (no Carfax/AutoCheck link available)"
    return False, f"{owners if owners is not None else 'unknown'} owner(s) on record"


def _eval_desirable_options(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    hit = _features_contain_any(ctx.get("vehicle_features"), _DESIRABLE_OPTION_KEYWORDS)
    if hit:
        return True, f"features include '{hit}'"
    return False, "no desirable-option keywords found"


def _eval_no_sunroof(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    is_base, _ = _eval_base_trim(ctx)
    if is_base:
        return False, "base trim — sunroof not expected"
    hit = _features_contain_any(ctx.get("vehicle_features"), _SUNROOF_KEYWORDS)
    if hit:
        return False, f"has '{hit}'"
    return True, "higher trim with no sunroof/moonroof in features"


def _eval_clean_recon(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    condition = (ctx.get("damage_overall_condition") or ctx.get("vehicle_condition") or "").lower()
    repair_cost = ctx.get("damage_repair_cost_usd")
    if condition in _CONDITION_GOOD_VALUES and (not repair_cost or repair_cost < 250):
        return True, f"condition '{condition}', est. recon ${repair_cost or 0:,.0f}"
    return False, "condition/recon not confirmed clean"


def _eval_recon_cost(ctx: Dict[str, Any]):
    """Tiered penalty driven by the damage report's estimated repair cost
    (the low/optimistic end of total_estimated_repair_cost_usd). Returns a
    per-tier point override; absent a damage report there's no cost to score."""
    cost = ctx.get("damage_repair_cost_usd")
    if cost is None:
        return False, _MISSING_REASON  # no damage report → no recon estimate
    if cost < 250:
        # The clean_recon factor already rewards this band; nothing to deduct.
        return False, f"est. recon ${cost:,.0f} (< $250 — negligible)"
    if cost < 1_500:
        return True, f"est. recon ${cost:,.0f} (minor)", -5
    if cost < 4_000:
        return True, f"est. recon ${cost:,.0f} (significant)", -12
    return True, f"est. recon ${cost:,.0f} (heavy — eats margin)", -25


def _eval_condition_poor(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    condition = (ctx.get("damage_overall_condition") or ctx.get("vehicle_condition") or "").lower()
    if condition in _CONDITION_POOR_VALUES:
        return True, f"condition reported as '{condition}'"
    return False, f"condition {condition or 'unknown'!r}"


def _eval_not_4x4(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    body_style = (ctx.get("body_style") or "").lower()
    if not _contains_any(body_style, _TRUCK_BODY_STYLE_KEYWORDS):
        return False, "not a truck — n/a"
    drivetrain = ctx.get("drivetrain")
    if not drivetrain:
        return False, "__missing__"  # truck but drivetrain unknown
    if _contains_any(drivetrain, _4X4_KEYWORDS):
        return False, f"drivetrain {drivetrain!r} is 4x4/AWD"
    return True, f"truck with drivetrain {drivetrain!r} (not 4x4)"


def _eval_shady_seller(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    joined = ctx.get("fb_joined_date_days_ago")
    verified = ctx.get("fb_verified")
    rating_count = ctx.get("fb_seller_rating_count")
    if joined is None and verified is None:
        return False, "__missing__"  # no account-age/verification data at all
    if joined is not None and joined < _NEW_ACCOUNT_DAYS:
        return True, f"FB account is only {joined} day(s) old"
    if verified is False and not rating_count:
        return True, "unverified FB account with no seller ratings"
    return False, "no new-account/unverified-seller signal"


def _eval_payoff_upside_down(ctx: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    paid_off = ctx.get("vehicle_is_paid_off")
    if paid_off is True:
        return False, "vehicle reported as paid off"
    return False, "__missing__"  # false/null can't be quantified without a payoff balance


# --------------------------------------------------------------------------- #
# Factor registry
# --------------------------------------------------------------------------- #

class Factor:
    __slots__ = ("id", "label", "points", "evaluator")

    def __init__(self, id_: str, label: str, points: int, evaluator: Evaluator):
        self.id = id_
        self.label = label
        self.points = points
        self.evaluator = evaluator


FACTORS: List[Factor] = [
    Factor("mmr_delta", "Under MMR", 12, _eval_mmr_delta),
    Factor("asking_too_much", "Asking Too Much (over MMR)", -12, _eval_asking_too_much),
    Factor("clean_title", "Clean Title", 10, _eval_clean_title),
    Factor("rare_trim", "Rare Car / Rare Trim", 15, _eval_rare_trim),
    Factor("base_trim", "Base Trim — Not Enough Options", -7, _eval_base_trim),
    Factor("low_miles_for_year", "Low Miles For Year", 5, _eval_low_miles_for_year),
    Factor("one_owner", "One Owner / Good Records", 4, _eval_one_owner),
    Factor("desirable_options", "Desirable Options", 3, _eval_desirable_options),
    Factor("no_sunroof", "No Sunroof", -5, _eval_no_sunroof),
    Factor("clean_recon", "Clean / Little to No Recon", 10, _eval_clean_recon),
    Factor("recon_cost", "Estimated Recon Cost (damage report)", -25, _eval_recon_cost),
    Factor("condition_poor", "Current Condition Poor", -20, _eval_condition_poor),
    Factor("not_4x4", "Not 4x4 (Required)", -6, _eval_not_4x4),
    Factor("shady_seller", "Shady Seller Signal", -12, _eval_shady_seller),
    Factor("payoff_upside_down", "Customer Owes Too Much", -10, _eval_payoff_upside_down),
]

# Rubric lines with no backing data anywhere in the schema today — always
# reported as missing rather than guessed at. (id, label, reason)
_ALWAYS_MISSING: List[Tuple[str, str, str]] = [
    ("title_not_in_name", "Title Not In Seller's Name", "no title-ownership data available"),
    ("mileage_discrepancy", "Mileage Discrepancy", "no odometer-rollback detection available"),
    ("transport_cost", "Nearby / Transport Cost", "no buyer base location stored to compute distance"),
    ("quality_build", "Quality Build / Too Many Mods", "no parts/receipts data available"),
    ("responsive_seller", "Fast Responsive Seller", "no seller response-time data available"),
    ("diesel_deleted", "Deleted Diesel / Emissions", "fuel type known but emissions-tamper status is not derivable"),
    ("too_new_for_lane", "Too New For Lane", "no manufacturer-rebate data available"),
    ("slow_segment", "Slow Segment", "no reliable segment-demand data source yet"),
    ("competition_risk", "Likely Competition", "no view-count/inquiry data available"),
]

_MISSING_REASON = "__missing__"


def evaluate(ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Score a lead's linked listing/contact context against the buy/no-buy rubric.

    `ctx` keys consumed: mmr, price, clean_title, vehicle_title_status, trim,
    miles, year, current_year, vehicle_number_of_owners, vehicle_features,
    damage_overall_condition, damage_repair_cost_usd, vehicle_condition,
    body_style, drivetrain, fb_joined_date_days_ago, fb_verified,
    fb_seller_rating_count, vehicle_is_paid_off.
    """
    killer_hit, killer_reason = _check_title_red_flag(ctx)

    factors_out: List[Dict[str, Any]] = []
    missing_out: List[Dict[str, Any]] = [
        {"id": id_, "label": label, "reason": reason} for id_, label, reason in _ALWAYS_MISSING
    ]

    total = 0
    for f in FACTORS:
        result = f.evaluator(ctx)
        # Evaluators may return (triggered, reason) or (triggered, reason, points).
        triggered, reason = result[0], result[1]
        points_override = result[2] if len(result) > 2 else None
        if reason == _MISSING_REASON:
            missing_out.append({"id": f.id, "label": f.label, "reason": "insufficient data for this lead"})
            continue
        if triggered:
            pts = points_override if points_override is not None else f.points
        else:
            pts = 0
        total += pts
        factors_out.append({
            "id": f.id, "label": f.label, "points": pts,
            "triggered": triggered, "reason": reason,
        })

    factors_out.append({
        "id": "title_red_flag",
        "label": "Salvage / Branded Title / Theft Recovery (deal killer)",
        "points": DEAL_KILLER_POINTS if killer_hit else 0,
        "triggered": killer_hit,
        "reason": killer_reason,
    })

    if killer_hit:
        verdict = VERDICT_DEAL_KILLER
        total_points = DEAL_KILLER_POINTS
    else:
        total_points = total
        if total_points >= BUYABLE_MIN:
            verdict = VERDICT_BUYABLE
        elif total_points >= MARGINAL_MIN:
            verdict = VERDICT_MARGINAL
        else:
            verdict = VERDICT_NOT_BUYABLE

    n_triggered = sum(1 for f in factors_out if f["triggered"])
    n_scoreable = len(factors_out)
    summary = (
        f"{verdict.replace('_', ' ').title()}: {total_points:+d} pts "
        f"({n_triggered} of {n_scoreable} scoreable factors triggered; "
        f"{len(missing_out)} factor(s) not evaluated — no data)"
    )

    return {
        "total_points": total_points,
        "verdict": verdict,
        "deal_killer": killer_hit,
        "factors": factors_out,
        "missing_factors": missing_out,
        "summary": summary,
    }


# --------------------------------------------------------------------------- #
# Context builder — the single mapping from a listing/contact/damage row to the
# ctx evaluate() consumes. Both the batch agent and the live listings display
# build their context here so the two can never diverge.
# --------------------------------------------------------------------------- #

def _to_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _account_age_days(raw_join_time: Any) -> Optional[int]:
    """contacts.fb_joined_date stores FB's join_time (Unix epoch seconds) as
    text. Best-effort parse; None if absent/unparseable."""
    if not raw_join_time:
        return None
    try:
        joined_epoch = int(str(raw_join_time).strip())
    except (TypeError, ValueError):
        return None
    now_epoch = datetime.now(timezone.utc).timestamp()
    return max(0, int((now_epoch - joined_epoch) // 86400))


def build_listing_context(row: Dict[str, Any]) -> Dict[str, Any]:
    """Map a listing row (+ joined contact/damage fields) to evaluate()'s ctx.

    Accepts these snake_case keys (all optional): mmr, price, clean_title,
    vehicle_title_status, trim, miles, year, vehicle_number_of_owners,
    vehicle_features, vehicle_condition, condition, body_style, drivetrain,
    vehicle_is_paid_off, damage_overall_condition, damage_repair_cost_usd,
    fb_joined_date, fb_verified, fb_seller_rating_count.
    """
    return {
        "mmr": _to_float(row.get("mmr")),
        "price": _to_float(row.get("price")),
        "clean_title": row.get("clean_title"),
        "vehicle_title_status": row.get("vehicle_title_status"),
        "trim": row.get("trim"),
        "miles": row.get("miles"),
        "year": row.get("year"),
        "current_year": datetime.now(timezone.utc).year,
        "vehicle_number_of_owners": row.get("vehicle_number_of_owners"),
        "vehicle_features": row.get("vehicle_features"),
        "vehicle_condition": row.get("vehicle_condition") or row.get("condition"),
        "body_style": row.get("body_style"),
        "drivetrain": row.get("drivetrain"),
        "vehicle_is_paid_off": row.get("vehicle_is_paid_off"),
        "damage_overall_condition": row.get("damage_overall_condition"),
        "damage_repair_cost_usd": _to_float(row.get("damage_repair_cost_usd")),
        "fb_joined_date_days_ago": _account_age_days(row.get("fb_joined_date")),
        "fb_verified": row.get("fb_verified"),
        "fb_seller_rating_count": row.get("fb_seller_rating_count"),
    }


def evaluate_listing(row: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience: build the context from a listing row and score it."""
    return evaluate(build_listing_context(row))
