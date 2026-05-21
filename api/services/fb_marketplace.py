"""
Adapter: raw Facebook Marketplace payload -> ListingIn-shaped dict.

The FB monitor can POST the raw FB JSON to /api/ingest/facebook unchanged;
this module reshapes it into the flat ListingIn schema before it hits the
standard ingestion pipeline.
"""
from typing import Any, Dict, List, Optional


def _get(d: Optional[Dict[str, Any]], *keys: str, default: Any = None) -> Any:
    cur: Any = d
    for k in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(k)
        if cur is None:
            return default
    return cur


def _as_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _as_int(v: Any) -> Optional[int]:
    if v is None:
        return None
    try:
        return int(v)
    except (TypeError, ValueError):
        return None


# FB returns vehicle_number_of_owners as a word enum ("ONE", "TWO", …)
# rather than a digit. Map to int so it lands in the INTEGER column.
_OWNER_WORDS = {
    "ZERO": 0, "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4,
    "FIVE": 5, "SIX": 6, "SEVEN": 7, "EIGHT": 8, "NINE": 9, "TEN": 10,
}


def _as_bool_enum(v: Any, truthy: tuple = (), falsy: tuple = ()) -> Optional[bool]:
    """Coerce FB's string-enum booleans (e.g. 'IS_PAID_OFF' / 'NOT_PAID_OFF')
    to real booleans. Real bool values pass through; unknown strings become None."""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        s = v.strip().upper()
        if s in truthy:
            return True
        if s in falsy:
            return False
    return None


def _as_owner_count(v: Any) -> Optional[int]:
    if v is None:
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str):
        s = v.strip().upper()
        if s in _OWNER_WORDS:
            return _OWNER_WORDS[s]
        try:
            return int(s)
        except (TypeError, ValueError):
            return None
    return None


def fb_payload_to_listing_in(fb: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten a raw FB Marketplace payload into a ListingIn-shaped dict.

    Only fields with a defined destination (column or contact field) are
    surfaced. The rest of the FB payload is intentionally dropped; the
    typed columns + listings.payload give us the queryable surface we want.
    """
    seller = fb.get("marketplace_listing_seller") or {}
    seller_stats = _get(seller, "marketplace_ratings_stats_by_role_v2", "seller_stats") or {}
    listing_price = fb.get("listing_price") or {}
    location = fb.get("location") or {}
    reverse_geo = location.get("reverse_geocode") or {}
    reverse_geo_detail = location.get("reverse_geocode_detailed") or {}
    city_page = reverse_geo.get("city_page") or {}
    odometer = fb.get("vehicle_odometer_data") or {}
    specs = fb.get("vehicle_specifications") or {}
    description = fb.get("redacted_description") or {}

    title = fb.get("marketplace_listing_title") or fb.get("custom_title")
    city = reverse_geo.get("city")
    state = reverse_geo.get("state")
    location_str = (
        f"{city}, {state}" if city and state
        else city or state or None
    )

    join_time = seller.get("join_time")
    seller_joined_date = str(join_time) if join_time is not None else None

    return {
        # Required
        "price": _as_float(listing_price.get("amount")) or 0.0,
        "miles": _as_int(odometer.get("value")) or 0,
        "dom": 0,

        # Identity / title
        "fbListingId": fb.get("logging_id") or fb.get("reportable_ent_id"),
        "title": title,
        "customTitle": fb.get("custom_title"),
        "marketplaceCategoryId": fb.get("marketplace_listing_category_id"),
        "currency": listing_price.get("currency"),
        "fbCreationTime": fb.get("creation_time"),
        "source": fb.get("share_uri"),

        # Vehicle identity (direct overrides; bypasses AI extraction)
        "vin": fb.get("vehicle_identification_number"),
        "make": fb.get("vehicle_make_display_name"),
        "model": fb.get("vehicle_model_display_name"),
        "trim": fb.get("vehicle_trim_display_name"),

        # Vehicle attributes
        "condition": fb.get("condition"),
        "vehicleCondition": fb.get("vehicle_condition"),
        "vehicleTitleStatus": fb.get("vehicle_title_status"),
        "vehicleFeatures": fb.get("vehicle_features"),
        "vehicleNumberOfOwners": _as_owner_count(fb.get("vehicle_number_of_owners")),
        "vehicleIsPaidOff": _as_bool_enum(
            fb.get("vehicle_is_paid_off"),
            truthy=("IS_PAID_OFF", "PAID_OFF", "TRUE", "YES"),
            falsy=("NOT_PAID_OFF", "FALSE", "NO"),
        ),
        "odometerUnit": odometer.get("unit"),
        "exteriorColor": fb.get("vehicle_exterior_color"),
        "interiorColor": fb.get("vehicle_interior_color"),
        "fuelType": fb.get("vehicle_fuel_type"),
        "transmission": fb.get("vehicle_transmission_type"),

        # Vehicle specs
        "horsePower": _as_float(specs.get("horse_power")),
        "gasMileageCity": _as_float(specs.get("gas_mileage_city")),
        "gasMileageHighway": _as_float(specs.get("gas_mileage_highway")),
        "gasMileageCombined": _as_float(specs.get("gas_mileage_combined")),
        "co2Emissions": _as_float(specs.get("co2_emissions")),
        "safetyRatingOverall": _as_float(specs.get("safety_rating_overall")),
        "safetyRatingFront": _as_float(specs.get("safety_rating_front")),
        "safetyRatingSide": _as_float(specs.get("safety_rating_side")),
        "safetyRatingRollover": _as_float(specs.get("safety_rating_rollover")),
        "safetyRatingSideBarrier": _as_float(specs.get("safety_rating_side_barrier")),

        # Geo
        "city": city,
        "state": state,
        "postalCode": reverse_geo_detail.get("postal_code_trimmed"),
        "country": reverse_geo_detail.get("country_alpha_two"),
        "cityDisplayName": city_page.get("display_name"),
        "fbCityId": city_page.get("id"),
        "latitude": _as_float(location.get("latitude")),
        "longitude": _as_float(location.get("longitude")),
        "location": location_str,

        # Lifecycle
        "isLive": fb.get("is_live"),
        "isSold": fb.get("is_sold"),
        "isPending": fb.get("is_pending"),
        "isOnMarketplace": fb.get("is_on_marketplace"),
        "isDraft": fb.get("is_draft"),
        "fbIsHidden": fb.get("is_hidden"),
        "listingInventoryType": fb.get("listing_inventory_type"),
        "deliveryTypes": fb.get("delivery_types"),

        # Seller classification
        "sellerType": fb.get("vehicle_seller_type"),
        "dealershipName": fb.get("dealership_name"),

        # Seller / contact
        "sellerName": seller.get("name"),
        "fbUserId": seller.get("id") or seller.get("user_id"),
        "sellerJoinedDate": seller_joined_date,
        "fbSellerRating": _as_float(seller_stats.get("five_star_ratings_average")),
        "fbSellerRatingCount": _as_int(seller_stats.get("five_star_total_rating_count_by_role")),
        "fbVerified": seller.get("marketplace_should_display_verified_badge"),

        # Other
        "phoneNumber": fb.get("seller_phone_number"),
        "sellerDescription": description.get("text"),
        "images": fb.get("image_urls") or [],
    }


def fb_payloads_to_listing_ins(fbs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [fb_payload_to_listing_in(p) for p in fbs]
