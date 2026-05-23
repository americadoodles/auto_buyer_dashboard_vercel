import json
import logging
import datetime
from typing import List, Optional
from datetime import timezone
from uuid import UUID, uuid4
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.listing import ListingIn, ListingOut
from ..schemas.listing import Decision
from ..services.ai_service import extract_vehicle_info_from_title, calculate_listing_score, extract_phone_number_from_text
from ..utils.gcp_storage import upload_images_to_gcp

# In-memory fallback for listings
_BY_ID: dict[str, ListingOut] = {}
_IDS_BY_VIN: dict[str, list[str]] = {}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_decision_from_data(data: dict) -> Optional[Decision]:
    """Create a Decision object from data if status, reasonCodes, or buyMax are present."""
    if data.get("status") or data.get("reasonCodes") or data.get("buyMax"):
        return Decision(
            status=data.get("status", ""),
            reasons=data.get("reasonCodes", []),
            buyMax=float(data.get("buyMax", 0)) if data.get("buyMax") is not None else 0
        )
    return None

def images_equal(incoming, existing):
    logging.debug(f"Comparing images: incoming={incoming}, existing={existing}")
    if not incoming and not existing:
        return True
    if not incoming:
        incoming = []
    if not existing:
        existing = []

    if isinstance(incoming, str):
        try:
            incoming = json.loads(incoming)
        except json.JSONDecodeError:
            incoming = [incoming]
    if isinstance(existing, str):
        try:
            existing = json.loads(existing)
        except json.JSONDecodeError:
            existing = [existing]

    incoming = [str(x) for x in incoming]
    existing = [str(x) for x in existing]

    result = sorted(incoming) == sorted(existing)
    logging.debug(f"Comparison result={result}")
    return result

# ============================================================================
# LISTINGS REPOSITORY
# ============================================================================

def ingest_listings(
    rows: List[ListingIn],
    buyer_id: Optional[str] = None,
    skip_ai_extraction: bool = False,
) -> List[ListingOut]:
    print(f">>> [ingest_listings] entry: {len(rows)} row(s), buyer_id={buyer_id}, "
          f"skip_ai_extraction={skip_ai_extraction}, DB_ENABLED={DB_ENABLED}", flush=True)
    out: list[ListingOut] = []
    if DB_ENABLED:
        with get_db_connection() as conn:
            if not conn:
                print(f">>> [ingest_listings] NO DB CONNECTION — returning empty", flush=True)
                return out
            
            cur = conn.cursor()
            
            # Collect all VINs and source URLs from incoming rows
            vins = []
            source_urls = []
            rows_with_data = []
            
            for item in rows:
                norm = item.model_dump()
                vin_raw = norm.get("vin")
                vin = vin_raw.strip().upper() if vin_raw and vin_raw.strip() else None
                source_url = norm.get("source")
                source_normalized = source_url.strip().lower() if source_url and source_url.strip() else None
                
                if vin:
                    vins.append(vin)
                if source_normalized and source_normalized != "unknown":
                    source_urls.append(source_normalized)
                
                rows_with_data.append({
                    "item": item,
                    "norm": norm,
                    "vin": vin,
                    "source": source_normalized
                })
            
            # Query existing VINs - normalize in query to catch all variations
            existing_vins = set()
            if vins:
                vin_placeholders = ','.join(['%s'] * len(vins))
                # Normalize VIN in query: UPPER(TRIM(vin)) to match our normalization
                cur.execute(
                    f"SELECT DISTINCT UPPER(TRIM(vin)) FROM listings WHERE UPPER(TRIM(vin)) IN ({vin_placeholders}) AND vin IS NOT NULL",
                    vins
                )
                for record in cur.fetchall():
                    if record[0]:
                        existing_vins.add(record[0].strip().upper())
            
            # Query existing source URLs - normalize in query to catch all variations
            existing_sources = set()
            if source_urls:
                source_placeholders = ','.join(['%s'] * len(source_urls))
                # Normalize source in query: LOWER(TRIM(source)) to match our normalization
                cur.execute(
                    f"SELECT DISTINCT LOWER(TRIM(source)) FROM listings WHERE LOWER(TRIM(source)) IN ({source_placeholders}) AND source IS NOT NULL",
                    source_urls
                )
                for record in cur.fetchall():
                    if record[0]:
                        existing_sources.add(record[0].lower().strip())
            
            # Pass every incoming row through to the per-row stage; the loop
            # below decides INSERT (new) vs UPDATE (existing) per row using
            # the same dedup keys (fb_listing_id > vin > source).
            rows_to_create = [row_data["item"] for row_data in rows_with_data]
            existing_vin_count = sum(
                1 for rd in rows_with_data if rd["vin"] and rd["vin"] in existing_vins
            )
            existing_source_count = sum(
                1 for rd in rows_with_data
                if not rd["vin"] and rd["source"] and rd["source"] in existing_sources
            )
            logging.info(
                f"Pre-batch dedup peek: {existing_vin_count} VIN matches, "
                f"{existing_source_count} source matches "
                f"(out of {len(rows)} incoming — duplicates will be UPDATED, not skipped)"
            )
            
            # Only process create for rows_to_create from here
            rows = rows_to_create
            try:
                with conn.cursor() as cur:
                    for item in rows:
                        norm = item.model_dump()
                        vin_raw = norm.get("vin")
                        vin = vin_raw.strip().upper() if vin_raw and vin_raw.strip() else None

                        def make_vehicle_key(n):
                            if vin:
                                return vin
                            # unique by timestamp when VIN missing; include source to be extra safe
                            created = (n.get("created_at") or datetime.datetime.now(timezone.utc))
                            src = (n.get("source") or "unknown").strip().lower()
                            return f"{src}#{created.isoformat(timespec='milliseconds')}"

                        vehicle_key = make_vehicle_key(norm)
                        
                        # Source-provided values (e.g. FB's vehicle_make_display_name) win
                        # over AI extraction. AI fills any gaps.
                        title = norm.get("title")
                        year = norm.get("year")
                        make = norm.get("make")
                        model = norm.get("model")
                        trim = norm.get("trim")
                        extracted_bodystyle = None
                        extracted_info = {}

                        if (
                            not skip_ai_extraction
                            and title and title.strip()
                            and not (year and make and model and trim)
                        ):
                            try:
                                extracted_info = extract_vehicle_info_from_title(title.strip())
                                year = year or extracted_info.get("year")
                                make = make or extracted_info.get("make")
                                model = model or extracted_info.get("model")
                                trim = trim or extracted_info.get("trim")
                                extracted_bodystyle = extracted_info.get("bodystyle")
                                logging.info(f"Vehicle info: year={year}, make={make}, model={model}, trim={trim}, bodystyle={extracted_bodystyle}")
                            except Exception as e:
                                logging.error(f"Failed to extract vehicle info from title '{title}': {str(e)}")
                                # Continue without extracted info - will need to handle missing fields
                        
                        # Normalize make and model
                        make = make.strip() if make and make.strip() else None
                        model = model.strip() if model and model.strip() else None
                        trim = trim.strip() if trim and trim.strip() else None
                        
                        # Skip vehicle insert/update if both make and model are empty/None
                        # A vehicle must have at least make or model to be valid
                        should_insert_vehicle = (make is not None and make != "") or (model is not None and model != "")
                        
                        # Handle external API data: map status, reasonCodes, buyMax to Decision object
                        decision = create_decision_from_data(norm)

                        # year/make/model/trim now live on listings directly (migration 019);
                        # no separate vehicles row is created.
                        if not should_insert_vehicle:
                            logging.info(f"vehicle_key={vehicle_key}: make and model are both empty/None")
                        
                        # Note: Decision data is used for ListingOut response only
                        # Score records are now always created by AI scoring (see below)
                        # This prevents duplicate score records
                        
                        # listings
                        # Convert datetime objects to ISO format strings for JSON serialization
                        payload_data = norm.copy()
                        if "created_at" in payload_data and payload_data["created_at"]:
                            if isinstance(payload_data["created_at"], datetime.datetime):
                                payload_data["created_at"] = payload_data["created_at"].isoformat()

                        # Normalize camelCase fields to snake_case columns
                        def _norm_str(val):
                            if val is None:
                                return None
                            if isinstance(val, str):
                                val = val.strip()
                                return val if val else None
                            return val

                        # Extract fields from norm, fallback to extracted_info if not available
                        interior_color = _norm_str(norm.get("interiorColor")) or _norm_str(extracted_info.get("interiorColor"))
                        exterior_color = _norm_str(norm.get("exteriorColor")) or _norm_str(extracted_info.get("exteriorColor"))
                        transmission = _norm_str(norm.get("transmission")) or _norm_str(extracted_info.get("transmission"))
                        fuel_type = _norm_str(norm.get("fuelType")) or _norm_str(extracted_info.get("fuelType"))
                        drivetrain = _norm_str(norm.get("driveType")) or _norm_str(extracted_info.get("driveType"))
                        engine_size = _norm_str(norm.get("engine_size")) or _norm_str(extracted_info.get("engine_size"))
                        body_style = _norm_str(norm.get("bodyStyle")) or _norm_str(extracted_bodystyle)
                        engine_desc = _norm_str(norm.get("engine")) or _norm_str(extracted_info.get("engine"))
                        mpg = _norm_str(norm.get("mpg")) or _norm_str(extracted_info.get("mpg"))

                        clean_title = norm.get("cleanTitle")
                        condition_txt = _norm_str(norm.get("condition"))
                        detailed_ratings = norm.get("detailedRatings")
                        overall_rating = _norm_str(norm.get("overallRating"))
                        paid_status = _norm_str(norm.get("paidStatus"))
                        phone_number = _norm_str(norm.get("phoneNumber"))
                        seller_description = _norm_str(norm.get("sellerDescription"))
                        
                        # Extract phone number from seller description if not provided
                        # if not phone_number and seller_description:
                        #     try:
                        #         extracted_phone = extract_phone_number_from_text(seller_description)
                        #         if extracted_phone:
                        #             phone_number = extracted_phone
                        #             logging.info(f"Extracted phone number from seller description: {phone_number}")
                        #     except Exception as e:
                        #         logging.warning(f"Failed to extract phone number from seller description: {str(e)}")
                        seller_joined_date = _norm_str(norm.get("sellerJoinedDate"))
                        seller_name = _norm_str(norm.get("sellerName"))
                        fb_user_id = _norm_str(norm.get("fbUserId"))
                        lpn = _norm_str(norm.get("lpn"))

                        # FB Marketplace fields (migration 023)
                        fb_listing_id          = _norm_str(norm.get("fbListingId"))
                        title_value            = _norm_str(norm.get("title"))
                        marketplace_category_id = _norm_str(norm.get("marketplaceCategoryId"))
                        currency               = _norm_str(norm.get("currency"))
                        fb_creation_epoch      = norm.get("fbCreationTime")
                        fb_creation_time       = (
                            datetime.datetime.fromtimestamp(fb_creation_epoch, tz=timezone.utc)
                            if isinstance(fb_creation_epoch, (int, float)) and fb_creation_epoch > 0
                            else None
                        )
                        city                   = _norm_str(norm.get("city"))
                        state                  = _norm_str(norm.get("state"))
                        postal_code            = _norm_str(norm.get("postalCode"))
                        latitude               = norm.get("latitude")
                        longitude              = norm.get("longitude")
                        is_live                = norm.get("isLive")
                        is_sold                = norm.get("isSold")
                        is_pending             = norm.get("isPending")
                        seller_type            = _norm_str(norm.get("sellerType"))
                        fb_seller_rating       = norm.get("fbSellerRating")
                        fb_seller_rating_count = norm.get("fbSellerRatingCount")
                        fb_verified            = norm.get("fbVerified")

                        # FB Marketplace fields (migration 024)
                        custom_title           = _norm_str(norm.get("customTitle"))
                        dealership_name        = _norm_str(norm.get("dealershipName"))
                        delivery_types         = norm.get("deliveryTypes") or None
                        listing_inventory_type = _norm_str(norm.get("listingInventoryType"))
                        country                = _norm_str(norm.get("country"))
                        city_display_name      = _norm_str(norm.get("cityDisplayName"))
                        fb_city_id             = _norm_str(norm.get("fbCityId"))
                        is_on_marketplace      = norm.get("isOnMarketplace")
                        is_draft               = norm.get("isDraft")
                        fb_is_hidden           = norm.get("fbIsHidden")
                        vehicle_condition_val  = _norm_str(norm.get("vehicleCondition"))
                        vehicle_title_status   = _norm_str(norm.get("vehicleTitleStatus"))
                        vehicle_features       = norm.get("vehicleFeatures") or None
                        vehicle_number_of_owners = norm.get("vehicleNumberOfOwners")
                        vehicle_is_paid_off    = norm.get("vehicleIsPaidOff")
                        odometer_unit          = _norm_str(norm.get("odometerUnit"))
                        horse_power            = norm.get("horsePower")
                        gas_mileage_city       = norm.get("gasMileageCity")
                        gas_mileage_highway    = norm.get("gasMileageHighway")
                        gas_mileage_combined   = norm.get("gasMileageCombined")
                        co2_emissions          = norm.get("co2Emissions")
                        safety_rating_overall  = norm.get("safetyRatingOverall")
                        safety_rating_front    = norm.get("safetyRatingFront")
                        safety_rating_side     = norm.get("safetyRatingSide")
                        safety_rating_rollover = norm.get("safetyRatingRollover")
                        safety_rating_side_barrier = norm.get("safetyRatingSideBarrier")

                        # Use buyer_id from authenticated context when provided; fallback to incoming buyer_id
                        buyer_from_id = buyer_id or norm.get("buyer_id") or None

                        # Upload images to GCP and get URLs
                        original_images = norm.get("images", [])
                        gcp_image_urls = []
                        if original_images:
                            try:
                                # Upload images to GCP before inserting listing
                                # Images are organized by source name (e.g., facebook, carfax)
                                # Structure: listings/{source_name}/{uuid}.jpg
                                source_url = norm.get("source")
                                gcp_image_urls = upload_images_to_gcp(
                                    original_images,
                                    listing_id=None,  # Not available yet - will be set after insert
                                    vin=vin,  # Passed for logging but not used for folder structure
                                    source=source_url,  # Used to determine folder structure
                                    max_workers=min(len(original_images), 30)
                                )
                                if gcp_image_urls:
                                    source_info = f"source: {source_url}" if source_url else "no source"
                                    vin_info = f"VIN: {vin}" if vin else "no VIN"
                                    logging.info(f"Uploaded {len(gcp_image_urls)} images to GCP ({source_info}, {vin_info})")
                                else:
                                    logging.warning(f"Failed to upload images to GCP, using original URLs")
                                    gcp_image_urls = original_images
                            except Exception as img_error:
                                logging.error(f"Error uploading images to GCP: {str(img_error)}")
                                # Fallback to original images if GCP upload fails
                                gcp_image_urls = original_images
                        else:
                            gcp_image_urls = []

                        # Match against an existing listing using the same dedup
                        # priority as before: fb_listing_id > vin > source.
                        existing_listing_id = None
                        match_reason = None
                        if fb_listing_id:
                            cur.execute(
                                "SELECT id FROM listings WHERE fb_listing_id = %s LIMIT 1",
                                (fb_listing_id,),
                            )
                            row_match = cur.fetchone()
                            if row_match:
                                existing_listing_id = row_match[0]
                                match_reason = f"fb_listing_id={fb_listing_id}"
                        if existing_listing_id is None and vin:
                            cur.execute(
                                "SELECT id FROM listings WHERE UPPER(TRIM(vin)) = %s LIMIT 1",
                                (vin,),
                            )
                            row_match = cur.fetchone()
                            if row_match:
                                existing_listing_id = row_match[0]
                                match_reason = f"vin={vin}"
                        if existing_listing_id is None and not vin:
                            src_norm = norm.get("source", "").strip().lower() if norm.get("source") else None
                            if src_norm and src_norm != "unknown":
                                cur.execute(
                                    "SELECT id FROM listings WHERE LOWER(TRIM(source)) = %s AND (vin IS NULL OR vin = '') LIMIT 1",
                                    (src_norm,),
                                )
                                row_match = cur.fetchone()
                                if row_match:
                                    existing_listing_id = row_match[0]
                                    match_reason = f"source={src_norm}"

                        print(f">>> [ingest_listings] row: fb_listing_id={fb_listing_id}, "
                              f"vin={vin}, source={(norm.get('source') or '')[:80]} → "
                              f"existing_listing_id={existing_listing_id} "
                              f"(match: {match_reason})", flush=True)

                        if existing_listing_id is not None:
                            # UPDATE: refresh fields on the existing row.
                            # Identity columns (vin, fb_listing_id, vehicle_key,
                            # source, buyer_id, created_at) are preserved.
                            # Most data columns use COALESCE so a null in the
                            # latest scrape doesn't wipe out a previously
                            # captured value. Lifecycle flags (is_live, is_sold,
                            # …) are refreshed unconditionally — latest wins.
                            # Images are overwritten only when the new scrape
                            # produced at least one GCS URL.
                            try:
                                cur.execute("""
                                    UPDATE listings SET
                                        price = %s,
                                        miles = %s,
                                        dom = %s,
                                        payload = %s,
                                        images = CASE
                                            WHEN COALESCE(array_length(%s::text[], 1), 0) > 0 THEN %s
                                            ELSE images
                                        END,
                                        -- Vehicle identity
                                        year                       = COALESCE(%s, year),
                                        make                       = COALESCE(%s, make),
                                        model                      = COALESCE(%s, model),
                                        trim                       = COALESCE(%s, trim),
                                        title                      = COALESCE(%s, title),
                                        custom_title               = COALESCE(%s, custom_title),
                                        marketplace_category_id    = COALESCE(%s, marketplace_category_id),
                                        currency                   = COALESCE(%s, currency),
                                        fb_creation_time           = COALESCE(%s, fb_creation_time),
                                        -- Vehicle attributes
                                        interior_color             = COALESCE(%s, interior_color),
                                        exterior_color             = COALESCE(%s, exterior_color),
                                        transmission               = COALESCE(%s, transmission),
                                        fuel_type                  = COALESCE(%s, fuel_type),
                                        drivetrain                 = COALESCE(%s, drivetrain),
                                        engine_size                = COALESCE(%s, engine_size),
                                        body_style                 = COALESCE(%s, body_style),
                                        engine                     = COALESCE(%s, engine),
                                        mpg                        = COALESCE(%s, mpg),
                                        clean_title                = COALESCE(%s, clean_title),
                                        condition                  = COALESCE(%s, condition),
                                        detailed_ratings           = COALESCE(%s, detailed_ratings),
                                        overall_rating             = COALESCE(%s, overall_rating),
                                        paid_status                = COALESCE(%s, paid_status),
                                        seller_description         = COALESCE(%s, seller_description),
                                        vehicle_condition          = COALESCE(%s, vehicle_condition),
                                        vehicle_title_status       = COALESCE(%s, vehicle_title_status),
                                        vehicle_features           = COALESCE(%s, vehicle_features),
                                        vehicle_number_of_owners   = COALESCE(%s, vehicle_number_of_owners),
                                        vehicle_is_paid_off        = COALESCE(%s, vehicle_is_paid_off),
                                        odometer_unit              = COALESCE(%s, odometer_unit),
                                        -- Vehicle specifications
                                        horse_power                = COALESCE(%s, horse_power),
                                        gas_mileage_city           = COALESCE(%s, gas_mileage_city),
                                        gas_mileage_highway        = COALESCE(%s, gas_mileage_highway),
                                        gas_mileage_combined       = COALESCE(%s, gas_mileage_combined),
                                        co2_emissions              = COALESCE(%s, co2_emissions),
                                        safety_rating_overall      = COALESCE(%s, safety_rating_overall),
                                        safety_rating_front        = COALESCE(%s, safety_rating_front),
                                        safety_rating_side         = COALESCE(%s, safety_rating_side),
                                        safety_rating_rollover     = COALESCE(%s, safety_rating_rollover),
                                        safety_rating_side_barrier = COALESCE(%s, safety_rating_side_barrier),
                                        -- Geo
                                        location                   = COALESCE(%s, location),
                                        city                       = COALESCE(%s, city),
                                        state                      = COALESCE(%s, state),
                                        postal_code                = COALESCE(%s, postal_code),
                                        country                    = COALESCE(%s, country),
                                        city_display_name          = COALESCE(%s, city_display_name),
                                        fb_city_id                 = COALESCE(%s, fb_city_id),
                                        latitude                   = COALESCE(%s, latitude),
                                        longitude                  = COALESCE(%s, longitude),
                                        -- Seller classification
                                        seller_type                = COALESCE(%s, seller_type),
                                        dealership_name            = COALESCE(%s, dealership_name),
                                        -- Lifecycle / commerce (latest scrape wins, no COALESCE)
                                        is_live                    = %s,
                                        is_sold                    = %s,
                                        is_pending                 = %s,
                                        is_on_marketplace          = %s,
                                        is_draft                   = %s,
                                        fb_is_hidden               = %s,
                                        delivery_types             = COALESCE(%s, delivery_types),
                                        listing_inventory_type     = COALESCE(%s, listing_inventory_type),
                                        updated_at = NOW(),
                                        updated_by = %s
                                    WHERE id = %s
                                """, (
                                    norm["price"], norm["miles"], norm["dom"],
                                    json.dumps(payload_data),
                                    gcp_image_urls, gcp_image_urls,
                                    # Identity
                                    year, make, model, trim,
                                    title_value, custom_title,
                                    marketplace_category_id, currency, fb_creation_time,
                                    # Attributes
                                    interior_color, exterior_color, transmission,
                                    fuel_type, drivetrain, engine_size, body_style,
                                    engine_desc, mpg, clean_title, condition_txt,
                                    json.dumps(detailed_ratings) if detailed_ratings is not None else None,
                                    overall_rating, paid_status, seller_description,
                                    vehicle_condition_val, vehicle_title_status, vehicle_features,
                                    vehicle_number_of_owners, vehicle_is_paid_off, odometer_unit,
                                    # Specs
                                    horse_power, gas_mileage_city, gas_mileage_highway,
                                    gas_mileage_combined, co2_emissions,
                                    safety_rating_overall, safety_rating_front, safety_rating_side,
                                    safety_rating_rollover, safety_rating_side_barrier,
                                    # Geo
                                    norm.get("location"), city, state, postal_code,
                                    country, city_display_name, fb_city_id,
                                    latitude, longitude,
                                    # Seller classification
                                    seller_type, dealership_name,
                                    # Lifecycle
                                    is_live, is_sold, is_pending,
                                    is_on_marketplace, is_draft, fb_is_hidden,
                                    delivery_types, listing_inventory_type,
                                    buyer_from_id,
                                    existing_listing_id,
                                ))
                                new_id = str(existing_listing_id)
                                print(f">>> [ingest_listings] UPDATED id={new_id} "
                                      f"(rowcount={cur.rowcount}, match: {match_reason}, "
                                      f"price={norm['price']}, miles={norm['miles']}, "
                                      f"mpg_city={gas_mileage_city}, "
                                      f"is_live={is_live}, is_sold={is_sold})", flush=True)
                            except Exception as upd_exc:
                                print(f">>> [ingest_listings] UPDATE FAILED id={existing_listing_id}: "
                                      f"{upd_exc}", flush=True)
                                logging.error(f"Failed to UPDATE listing id={existing_listing_id}: {upd_exc}")
                                new_id = f"error-{len(out)+1}"
                            # Skip the INSERT branch below; downstream contact/lead/score
                            # logic still runs against new_id so seller info on the
                            # contact row gets refreshed too.

                        # Prefer writing to buyer_id column;
                        try:
                          if existing_listing_id is None:
                            cur.execute("""
                              insert into listings (
                                vehicle_key, vin, lpn, source, price, miles, dom, location, buyer_id, payload, images,
                                interior_color, exterior_color, transmission, fuel_type, drivetrain, engine_size, body_style,
                                clean_title, condition, detailed_ratings, engine, mpg, overall_rating, paid_status,
                                seller_description,
                                year, make, model, trim,
                                fb_listing_id, title, marketplace_category_id, currency, fb_creation_time,
                                city, state, postal_code, latitude, longitude,
                                is_live, is_sold, is_pending, seller_type,
                                custom_title, dealership_name, delivery_types, listing_inventory_type,
                                country, city_display_name, fb_city_id,
                                is_on_marketplace, is_draft, fb_is_hidden,
                                vehicle_condition, vehicle_title_status, vehicle_features,
                                vehicle_number_of_owners, vehicle_is_paid_off, odometer_unit,
                                horse_power, gas_mileage_city, gas_mileage_highway, gas_mileage_combined,
                                co2_emissions,
                                safety_rating_overall, safety_rating_front, safety_rating_side,
                                safety_rating_rollover, safety_rating_side_barrier
                              )
                              values (
                                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                                %s,%s,%s,%s,%s,%s,%s,
                                %s,%s,%s,%s,%s,%s,%s,
                                %s,
                                %s,%s,%s,%s,
                                %s,%s,%s,%s,%s,
                                %s,%s,%s,%s,%s,
                                %s,%s,%s,%s,
                                %s,%s,%s,%s,
                                %s,%s,%s,
                                %s,%s,%s,
                                %s,%s,%s,
                                %s,%s,%s,
                                %s,%s,%s,%s,
                                %s,
                                %s,%s,%s,
                                %s,%s
                              ) returning id
                            """, (
                                vehicle_key, vin, lpn, norm["source"], norm["price"], norm["miles"], norm["dom"],
                                norm.get("location"), buyer_from_id, json.dumps(payload_data), gcp_image_urls,
                                interior_color, exterior_color, transmission, fuel_type, drivetrain, engine_size, body_style,
                                clean_title, condition_txt, json.dumps(detailed_ratings) if detailed_ratings is not None else None,
                                engine_desc, mpg, overall_rating, paid_status,
                                seller_description,
                                year, make, model, trim,
                                fb_listing_id, title_value, marketplace_category_id, currency, fb_creation_time,
                                city, state, postal_code, latitude, longitude,
                                is_live, is_sold, is_pending, seller_type,
                                custom_title, dealership_name, delivery_types, listing_inventory_type,
                                country, city_display_name, fb_city_id,
                                is_on_marketplace, is_draft, fb_is_hidden,
                                vehicle_condition_val, vehicle_title_status, vehicle_features,
                                vehicle_number_of_owners, vehicle_is_paid_off, odometer_unit,
                                horse_power, gas_mileage_city, gas_mileage_highway, gas_mileage_combined,
                                co2_emissions,
                                safety_rating_overall, safety_rating_front, safety_rating_side,
                                safety_rating_rollover, safety_rating_side_barrier,
                            ))
                            new_id = str(cur.fetchone()[0])
                            print(f">>> [ingest_listings] INSERTED id={new_id} "
                                  f"vin={vin} fb_listing_id={fb_listing_id} "
                                  f"price={norm['price']} miles={norm['miles']}", flush=True)
                            logging.debug(f"Successfully inserted listing with ID: {new_id}, VIN: {vin}, source: {norm.get('source')}")
                        except Exception as log_exc:
                            print(f">>> [ingest_listings] INSERT FAILED: {log_exc}", flush=True)
                            logging.error(f"Failed to insert listing into database: {log_exc}")
                            new_id = f"error-{len(out)+1}"
                        
                        # Create or link a seller contact when we have either a phone or a FB user id.
                        contact_id = None
                        phone_for_lookup = phone_number.strip() if phone_number and phone_number.strip() else None
                        if phone_for_lookup or fb_user_id:
                            try:
                                # Dedupe by phone OR fb_user_id (whichever we have).
                                # Explicit ::text casts so Postgres can infer the
                                # parameter type when the value is Python None.
                                cur.execute("""
                                    SELECT id FROM contacts
                                    WHERE (%s::text IS NOT NULL AND (phone = %s::text OR mobile = %s::text))
                                       OR (%s::text IS NOT NULL AND fb_user_id = %s::text)
                                    LIMIT 1
                                """, (phone_for_lookup, phone_for_lookup, phone_for_lookup,
                                      fb_user_id, fb_user_id))
                                existing_contact = cur.fetchone()

                                if existing_contact:
                                    contact_id = existing_contact[0]
                                    logging.info(f"Found existing contact {contact_id} (phone={phone_for_lookup}, fb_user_id={fb_user_id})")
                                    # Patch missing fb identity fields without overwriting existing values;
                                    # refresh rating / verified-badge snapshot unconditionally (latest wins).
                                    cur.execute("""
                                        UPDATE contacts
                                        SET fb_user_id             = COALESCE(fb_user_id, %s),
                                            fb_joined_date         = COALESCE(fb_joined_date, %s),
                                            fb_seller_rating       = COALESCE(%s, fb_seller_rating),
                                            fb_seller_rating_count = COALESCE(%s, fb_seller_rating_count),
                                            fb_verified            = COALESCE(%s, fb_verified),
                                            updated_at             = NOW()
                                        WHERE id = %s
                                    """, (
                                        fb_user_id, seller_joined_date,
                                        fb_seller_rating, fb_seller_rating_count, fb_verified,
                                        contact_id,
                                    ))
                                else:
                                    # Parse seller_name for first_name and last_name
                                    first_name = "Seller"
                                    last_name = "Unknown"
                                    if seller_name and seller_name.strip():
                                        name_parts = seller_name.strip().split()
                                        if len(name_parts) >= 2:
                                            first_name = name_parts[0]
                                            last_name = " ".join(name_parts[1:])
                                        elif len(name_parts) == 1:
                                            first_name = name_parts[0]
                                    
                                    # Get default created_by user (use buyer_from_id if available, otherwise get first admin user)
                                    created_by_user = None
                                    if buyer_from_id:
                                        try:
                                            cur.execute("SELECT id FROM users WHERE id::text = %s", (buyer_from_id,))
                                            user_result = cur.fetchone()
                                            if user_result:
                                                created_by_user = user_result[0]
                                        except Exception:
                                            pass
                                    else:
                                        created_by_user = "unknown"

                                    if not created_by_user:
                                        logging.warning("No user found for contact creation, skipping contact/lead creation")
                                    else:
                                        # Create contact directly in the database
                                        try:
                                            cur.execute("""
                                                INSERT INTO contacts (
                                                    first_name, last_name, phone, company, notes,
                                                    fb_user_id, fb_joined_date,
                                                    fb_seller_rating, fb_seller_rating_count, fb_verified,
                                                    is_active, created_by, created_at, updated_at
                                                ) VALUES (
                                                    %s, %s, %s, %s, %s,
                                                    %s, %s,
                                                    %s, %s, %s,
                                                    %s, %s, NOW(), NOW()
                                                ) RETURNING id
                                            """, (
                                                first_name,
                                                last_name,
                                                phone_for_lookup,
                                                # company = the actual dealership name when the seller is a dealer.
                                                # FB's dealership_name is NULL for PRIVATE_SELLER listings, which is correct.
                                                dealership_name,
                                                f"Auto-created from listing {new_id}. Source: {norm.get('source', 'Unknown')}",
                                                fb_user_id,
                                                seller_joined_date,
                                                fb_seller_rating,
                                                fb_seller_rating_count,
                                                fb_verified,
                                                True,
                                                created_by_user,
                                            ))
                                            
                                            contact_result = cur.fetchone()
                                            if contact_result:
                                                contact_id = contact_result[0]
                                                logging.info(f"Created contact {contact_id} for phone {phone_number}")
                                                
                                                # Create lead linking listing to contact
                                                cur.execute("""
                                                    INSERT INTO leads (
                                                        listing_id, contact_id, notes, lead_score,
                                                        created_by, created_at, updated_at
                                                    ) VALUES (
                                                        %s, %s, %s, %s, %s, NOW(), NOW()
                                                    ) RETURNING id
                                                """, (
                                                    int(new_id),
                                                    contact_id,
                                                    f"Auto-created lead from listing {new_id}. Vehicle: {year} {make} {model}",
                                                    0,
                                                    created_by_user
                                                ))
                                                
                                                lead_result = cur.fetchone()
                                                if lead_result:
                                                    logging.info(f"Created lead {lead_result[0]} for listing {new_id} and contact {contact_id}")
                                                else:
                                                    logging.warning(f"Failed to create lead for listing {new_id}")
                                            else:
                                                logging.warning(f"Failed to create contact for phone {phone_number}")
                                        except Exception as contact_error:
                                            logging.error(f"Failed to create contact/lead for phone {phone_number}: {str(contact_error)}")
                                            # Continue with listing ingestion even if contact/lead creation fails
                            except Exception as contact_lead_error:
                                logging.error(f"Error creating contact/lead for listing {new_id}: {str(contact_lead_error)}")
                                # Continue with listing ingestion even if contact/lead creation fails

                        # Pin the seller contact onto the listing for direct FK access.
                        if contact_id and str(new_id).isdigit():
                            try:
                                cur.execute(
                                    "UPDATE listings SET contact_id = %s WHERE id = %s",
                                    (contact_id, int(new_id)),
                                )
                            except Exception as link_err:
                                logging.warning(f"Failed to set listings.contact_id for listing {new_id}: {link_err}")

                        # Extract reasonCodes, buyMax, and status for ListingOut
                        reason_codes = norm.get("reasonCodes", [])
                        buy_max = float(norm.get("buyMax", 0)) if norm.get("buyMax") is not None else None
                        status = norm.get("status", "")
                        
                        # Calculate AI-based score automatically during ingestion
                        score_val = None
                        calculated_buy_max = buy_max
                        calculated_reason_codes = reason_codes

                        if skip_ai_extraction:
                            logging.info(f"Skipping AI scoring for listing {new_id} (skip_ai_extraction=True)")
                        else:
                            try:
                                # Prepare listing data for AI scoring
                                listing_data = {
                                    "year": year,
                                    "make": make,
                                    "model": model,
                                    "trim": trim,
                                    "vin": vin,
                                    "price": norm["price"],
                                    "mmr": norm.get("mmr"),
                                    "miles": norm["miles"],
                                    "dom": norm["dom"],
                                    "condition": norm.get("condition"),
                                    "overallRating": norm.get("overallRating"),
                                    "detailedRatings": norm.get("detailedRatings"),
                                    "cleanTitle": norm.get("cleanTitle"),
                                    "bodyStyle": body_style or extracted_bodystyle,
                                    "transmission": norm.get("transmission"),
                                    "fuelType": norm.get("fuelType"),
                                    "driveType": norm.get("driveType"),
                                    "engine": norm.get("engine"),
                                    "mpg": norm.get("mpg"),
                                    "exteriorColor": norm.get("exteriorColor"),
                                    "interiorColor": norm.get("interiorColor"),
                                    "location": norm.get("location"),
                                    "source": norm.get("source"),
                                    "sellerName": norm.get("sellerName"),
                                    "phoneNumber": norm.get("phoneNumber"),
                                    "sellerDescription": norm.get("sellerDescription"),
                                    "sellerJoinedDate": norm.get("sellerJoinedDate"),
                                    "paidStatus": norm.get("paidStatus"),
                                    "notes": norm.get("notes")
                                }

                                # Calculate score using AI (no contact info available during ingestion)
                                # Note: calculate_listing_score automatically resolves adjusted MMR
                                # from the mmr_data table using the VIN, overriding listing_data['mmr']
                                score_result = calculate_listing_score(listing_data)
                                score_val = score_result["score"]
                                calculated_buy_max = score_result["buyMax"]
                                calculated_reason_codes = score_result["reasonCodes"]

                                # Store score in database
                                if vin:
                                    insert_score(vehicle_key, vin, score_val, calculated_buy_max, calculated_reason_codes)
                                    update_cached_score(vin, score_val, calculated_buy_max, calculated_reason_codes)

                                logging.info(f"Calculated AI score for listing {new_id}: score={score_val}, buyMax={calculated_buy_max}")
                            except Exception as score_error:
                                logging.warning(f"Failed to calculate AI score for listing {new_id}: {str(score_error)}")
                                # Continue with ingestion even if scoring fails
                        
                        out.append(ListingOut(
                            id=new_id, vehicle_key=vehicle_key, vin=vin, year=year, make=make, model=model,
                            trim=trim, miles=norm["miles"], price=norm["price"], dom=norm["dom"],
                            source=norm["source"], location=norm.get("location"), buyer_id=buyer_from_id,
                            radius=norm.get("radius", 25), reasonCodes=calculated_reason_codes,
                            buyMax=calculated_buy_max, status=status, score=score_val, decision=decision, 
                            bodyStyle=body_style, images=gcp_image_urls if gcp_image_urls else None
                        ))
            except Exception as e:
                print(f">>> [ingest_listings] OUTER EXCEPTION (loop aborted, returning {len(out)} so far): {e}", flush=True)
                logging.error(f"Database error in ingest_listings: {e}")
                return out
        print(f">>> [ingest_listings] exit: returning {len(out)} ListingOut(s)", flush=True)
        return out


def list_listings(
    limit: Optional[int] = None,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
) -> list[ListingOut]:
    if DB_ENABLED:
        with get_db_connection() as conn:
            if not conn:
                return []
                
            try:
                with conn.cursor() as cur:
                    # Build date filter conditions first
                    date_conditions = []
                    params: list = []
                    if start_date:
                        date_conditions.append("created_at >= %s")
                        params.append(start_date)
                        logging.info(f"Filtering listings with start_date: {start_date} (type: {type(start_date)})")
                    if end_date:
                        date_conditions.append("created_at <= %s")
                        params.append(end_date)
                        logging.info(f"Filtering listings with end_date: {end_date} (type: {type(end_date)})")
                    
                    # Build WHERE clause for subquery
                    where_clause = ""
                    if date_conditions:
                        where_clause = "WHERE " + " AND ".join(date_conditions)
                    
                    # Query with date-filtered subquery
                    query = """
                    SELECT
                        l.id,
                        l.vehicle_key,
                        COALESCE(l.vin, '') AS vin,
                        l.lpn,
                        COALESCE(l.year, 0) AS year,
                        COALESCE(l.make, '') AS make,
                        COALESCE(l.model, '') AS model,
                        l.trim,
                        l.miles,
                        l.price,
                        l.dom,
                        l.source,
                        l.location,
                        l.buyer_id,
                        COALESCE(l.images, ARRAY[]::text[]) AS images,
                        u.username AS buyer_username,
                        COALESCE(s.score, 0) AS score,
                        s.buy_max,
                        COALESCE(s.reason_codes, ARRAY[]::text[]) AS reason_codes,
                        l.created_at,
                        l.payload,
                        l.notes,
                        l.interior_color,
                        l.exterior_color,
                        l.transmission,
                        l.fuel_type,
                        l.drivetrain,
                        l.body_style,
                        l.updated_at,
                        l.updated_by,
                        l.mmr,
                        l.clean_title,
                        l.condition,
                        l.detailed_ratings,
                        l.engine,
                        l.mpg,
                        l.overall_rating,
                        l.paid_status,
                        c.phone AS phone_number,
                        l.seller_description,
                        c.fb_joined_date AS seller_joined_date,
                        NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '') AS seller_name
                        FROM (
                        SELECT * FROM listings """ + where_clause + """
                        ) l
                        LEFT JOIN (
                        SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                        FROM scores
                        ORDER BY vin, created_at DESC
                        ) s ON s.vin = l.vin
                        LEFT JOIN users u ON u.id::text = l.buyer_id
                        LEFT JOIN contacts c ON c.id = l.contact_id
                        ORDER BY l.created_at DESC;

                    """
                    
                    logging.info(f"Query will execute with {len(params)} date parameters")

                    if limit is not None:
                        query += " LIMIT %s"
                        params.append(limit)

                    cur.execute(query, tuple(params))
                    results = cur.fetchall()
                    logging.info(f"Query returned {len(results)} raw results")
                    out: list[ListingOut] = []
                    for rid, vehicle_key, vin, lpn, year, make, model, trim, miles, price, dom, source, location, buyer_id, images, buyer_username, score, buy_max, reason_codes, created_at, payload, notes, interior_color, exterior_color, transmission, fuel_type, drivetrain, body_style, updated_at, updated_by, mmr, clean_title, condition, detailed_ratings, engine, mpg, overall_rating, paid_status, phone_number, seller_description, seller_joined_date, seller_name in results:
                        # Extract decision data from payload if available
                        decision = None
                        status = ""
                        if payload:
                            payload_data = json.loads(payload) if isinstance(payload, str) else payload
                            decision = create_decision_from_data(payload_data)
                            status = payload_data.get("status", "")
                        
                        # Parse detailed_ratings JSONB if it's a string
                        detailed_ratings_list = None
                        if detailed_ratings:
                            if isinstance(detailed_ratings, str):
                                try:
                                    detailed_ratings_list = json.loads(detailed_ratings)
                                except:
                                    detailed_ratings_list = None
                            else:
                                detailed_ratings_list = detailed_ratings
                        
                        out.append(ListingOut(
                            id=str(rid),
                            vehicle_key=vehicle_key,
                            vin=vin or "",
                            lpn=lpn,
                            price=float(price),
                            miles=int(miles),
                            dom=int(dom),
                            year=int(year) if year is not None else 0,
                            make=make or "",
                            model=model or "",
                            location=location,
                            radius=25,
                            images=images or [],
                            transmission=transmission,
                            exteriorColor=exterior_color,
                            interiorColor=interior_color,
                            fuelType=fuel_type,
                            overallRating=overall_rating,
                            detailedRatings=detailed_ratings_list,
                            condition=condition,
                            mpg=mpg,
                            cleanTitle=clean_title,
                            paidStatus=paid_status,
                            sellerDescription=seller_description,
                            sellerName=seller_name,
                            sellerJoinedDate=seller_joined_date,
                            phoneNumber=phone_number,
                            engine=engine,
                            driveType=drivetrain,
                            bodyStyle=body_style,
                            source=source,
                            status=status,
                            reasonCodes=reason_codes or [],
                            buyMax=float(buy_max) if buy_max is not None else None,
                            trim=trim,
                            buyer_id=buyer_id,
                            buyer_username=buyer_username,
                            decision=decision,
                            created_at=created_at,
                            notes=notes,
                            updated_at=updated_at,
                            updated_by=updated_by,
                            score=int(score) if score is not None else None,
                            mmr=float(mmr) if mmr is not None else None
                        ))
                    logging.info(f"Returning {len(out)} processed listings")
                    return out
            except Exception as e:
                logging.error(f"Error in list_listings: {str(e)}")
                import traceback
                logging.error(f"Traceback: {traceback.format_exc()}")
                return []
    return list(_BY_ID.values())

def list_listings_by_buyer(
    buyer_id: str,
    start_date: Optional[datetime.datetime] = None,
    end_date: Optional[datetime.datetime] = None,
    limit: Optional[int] = None
) -> list[ListingOut]:
    """Get listings for a specific buyer with optional date filtering"""
    if DB_ENABLED:
        with get_db_connection() as conn:
            if not conn:
                return []
                
            try:
                with conn.cursor() as cur:
                    # Build query with optional date filtering
                    base_query = """
                        SELECT
                            l.id, l.vehicle_key,
                            COALESCE(l.vin, '') AS vin,
                            l.lpn,
                            COALESCE(l.year, 0) AS year,
                            COALESCE(l.make, '') AS make,
                            COALESCE(l.model, '') AS model,
                            l.trim,
                            l.miles, l.price, l.dom, l.source, 
                            l.location, l.buyer_id,
                            COALESCE(l.images, ARRAY[]::text[]) AS images,
                            u.username AS buyer_username,
                            COALESCE(s.score, 0) AS score, 
                            s.buy_max, 
                            COALESCE(s.reason_codes, ARRAY[]::text[]) AS reason_codes,
                            l.created_at,
                            l.payload,
                            l.notes,
                            l.interior_color,
                            l.exterior_color,
                            l.transmission,
                            l.fuel_type,
                            l.drivetrain,
                            l.body_style,
                            l.updated_at,
                            l.updated_by,
                            l.mmr,
                            l.clean_title,
                            l.condition,
                            l.detailed_ratings,
                            l.engine,
                            l.mpg,
                            l.overall_rating,
                            l.paid_status,
                            c.phone AS phone_number,
                            l.seller_description,
                            c.fb_joined_date AS seller_joined_date,
                            NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '') AS seller_name
                        FROM listings l
                        LEFT JOIN (
                            SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                            FROM scores
                            ORDER BY vin, created_at DESC
                        ) s ON s.vin = l.vin
                        LEFT JOIN users u ON u.id::text = l.buyer_id
                        LEFT JOIN contacts c ON c.id = l.contact_id
                        WHERE l.buyer_id = %s
                    """
                    
                    params = [buyer_id]
                    
                    if start_date:
                        base_query += " AND l.created_at >= %s"
                        params.append(start_date)
                        logging.info(f"Filtering listings by buyer with start_date: {start_date} (type: {type(start_date)})")
                    
                    if end_date:
                        base_query += " AND l.created_at <= %s"
                        params.append(end_date)
                        logging.info(f"Filtering listings by buyer with end_date: {end_date} (type: {type(end_date)})")
                    
                    logging.info(f"Query will execute with {len(params)} parameters (buyer_id + date params)")
                    
                    base_query += " ORDER BY l.created_at DESC"
                    
                    if limit is not None:
                        base_query += " LIMIT %s"
                        params.append(limit)
                    
                    cur.execute(base_query, params)
                    results = cur.fetchall()
                    logging.info(f"Query for buyer {buyer_id} returned {len(results)} raw results")

                    out: list[ListingOut] = []
                    for (
                        rid, vehicle_key, vin, lpn, year, make, model, trim, miles, price, dom,
                        source, location, buyer_id, images, buyer_username, score, buy_max,
                        reason_codes, created_at, payload, notes, interior_color,
                        exterior_color, transmission, fuel_type, drivetrain,
                        body_style, updated_at, updated_by, mmr, clean_title, condition,
                        detailed_ratings, engine, mpg, overall_rating, paid_status, phone_number,
                        seller_description, seller_joined_date, seller_name
                    ) in results:
                        
                        # Extract decision data from payload if available
                        decision = None
                        status = ""
                        if payload:
                            payload_data = json.loads(payload) if isinstance(payload, str) else payload
                            decision = create_decision_from_data(payload_data)
                            status = payload_data.get("status", "")
                        
                        # Parse detailed_ratings JSONB if it's a string
                        detailed_ratings_list = None
                        if detailed_ratings:
                            if isinstance(detailed_ratings, str):
                                try:
                                    detailed_ratings_list = json.loads(detailed_ratings)
                                except:
                                    detailed_ratings_list = None
                            else:
                                detailed_ratings_list = detailed_ratings
                        
                        out.append(ListingOut(
                            id=str(rid),
                            vehicle_key=vehicle_key,
                            vin=vin or "",
                            lpn=lpn,
                            price=float(price),
                            miles=int(miles),
                            dom=int(dom),
                            year=int(year) if year is not None else 0,
                            make=make or "",
                            model=model or "",
                            location=location,
                            radius=25,
                            images=images or [],
                            transmission=transmission,
                            exteriorColor=exterior_color,
                            interiorColor=interior_color,
                            fuelType=fuel_type,
                            overallRating=overall_rating,
                            detailedRatings=detailed_ratings_list,
                            condition=condition,
                            mpg=mpg,
                            cleanTitle=clean_title,
                            paidStatus=paid_status,
                            sellerDescription=seller_description,
                            sellerName=seller_name,
                            sellerJoinedDate=seller_joined_date,
                            phoneNumber=phone_number,
                            engine=engine,
                            driveType=drivetrain,
                            bodyStyle=body_style,
                            source=source,
                            status=status,
                            reasonCodes=reason_codes or [],
                            buyMax=float(buy_max) if buy_max is not None else None,
                            trim=trim,
                            buyer_id=buyer_id,
                            buyer_username=buyer_username,
                            decision=decision,
                            created_at=created_at,
                            notes=notes,
                            updated_at=updated_at,
                            updated_by=updated_by,
                            score=int(score) if score is not None else None,
                            mmr=float(mmr) if mmr is not None else None
                        ))
                    logging.info(f"Returning {len(out)} processed listings for buyer {buyer_id}")
                    return out
            except Exception as e:
                logging.error(f"Error in list_listings_by_buyer: {str(e)}")
                import traceback
                logging.error(f"Traceback: {traceback.format_exc()}")
                return []

    # Fallback to in-memory filtering
    return [listing for listing in _BY_ID.values() if listing.buyer_id == buyer_id]


def get_buyer_stats(buyer_id: str, start_date: Optional[datetime.datetime] = None, end_date: Optional[datetime.datetime] = None) -> dict:
    """Get performance statistics for a specific buyer"""
    try:
        if DB_ENABLED:
            with get_db_connection() as conn:
                if not conn:
                    return {}
                    
                try:
                    with conn.cursor() as cur:
                        # Simple query without complex joins first
                        base_query = """
                      SELECT 
                        COUNT(*) as total_listings,
                        AVG(l.price) as avg_price,
                        MIN(l.created_at) as first_listing,
                        MAX(l.created_at) as last_listing,
                        COUNT(DISTINCT l.source) as unique_sources
                      FROM listings l
                      WHERE l.buyer_id = %s
                    """
                        
                        params = [buyer_id]
                        
                        if start_date:
                            base_query += " AND l.created_at >= %s"
                            params.append(start_date)
                        
                        if end_date:
                            base_query += " AND l.created_at <= %s"
                            params.append(end_date)
                        
                        cur.execute(base_query, params)
                        result = cur.fetchone()
                        
                        if result:
                            total_listings, avg_price, first_listing, last_listing, unique_sources = result
                            
                            # Get scored listings count separately
                            scored_query = """
                            SELECT COUNT(*) as scored_listings, AVG(s.score) as avg_score
                            FROM listings l
                            JOIN v_latest_scores s ON s.vin = l.vin
                            WHERE l.buyer_id = %s
                            """
                            scored_params = [buyer_id]
                            
                            if start_date:
                                scored_query += " AND l.created_at >= %s"
                                scored_params.append(start_date)
                            
                            if end_date:
                                scored_query += " AND l.created_at <= %s"
                                scored_params.append(end_date)
                            
                            cur.execute(scored_query, scored_params)
                            scored_result = cur.fetchone()
                            
                            scored_listings = scored_result[0] if scored_result else 0
                            avg_score = scored_result[1] if scored_result and scored_result[1] else 0
                            
                            return {
                                "total_listings": total_listings or 0,
                                "scored_listings": scored_listings or 0,
                                "avg_score": float(avg_score) if avg_score else 0,
                                "avg_price": float(avg_price) if avg_price else 0,
                                "first_listing": first_listing.isoformat() if first_listing else None,
                                "last_listing": last_listing.isoformat() if last_listing else None,
                                "unique_sources": unique_sources or 0,
                                "scoring_rate": (scored_listings / total_listings * 100) if total_listings > 0 else 0
                            }
                        return {}
                except Exception as e:
                    logging.error(f"Database error: {e}")
                    return {}
        
        # Fallback to in-memory calculation
        buyer_listings = [listing for listing in _BY_ID.values() if listing.buyer_id == buyer_id]
        
        if not buyer_listings:
            return {}
        
        # Calculate stats from in-memory data
        total_listings = len(buyer_listings)
        scored_listings = len([l for l in buyer_listings if l.score is not None])
        avg_score = sum(l.score for l in buyer_listings if l.score is not None) / scored_listings if scored_listings > 0 else 0
        avg_price = sum(l.price for l in buyer_listings) / total_listings if total_listings > 0 else 0
        first_listing = min(buyer_listings, key=lambda x: x.created_at).created_at if buyer_listings else None
        last_listing = max(buyer_listings, key=lambda x: x.created_at).created_at if buyer_listings else None
        unique_sources = len(set(l.source for l in buyer_listings))
        scoring_rate = (scored_listings / total_listings * 100) if total_listings > 0 else 0
        
        return {
            "total_listings": total_listings,
            "scored_listings": scored_listings,
            "avg_score": float(avg_score),
            "avg_price": float(avg_price),
            "first_listing": first_listing.isoformat() if first_listing else None,
            "last_listing": last_listing.isoformat() if last_listing else None,
            "unique_sources": unique_sources,
            "scoring_rate": scoring_rate
        }
    except Exception as e:
        logging.error(f"Unexpected error in get_buyer_stats: {e}")
        return {}

def update_cached_score(vin: str, score: int, buy_max: float, reasons: list[str]):
    # for in-memory cache parity; DB is handled in scores repo
    if vin:
        for lid in _IDS_BY_VIN.get(vin, []):
            if lid in _BY_ID:
                obj = _BY_ID[lid]
                obj.score = score
                obj.buyMax = buy_max
                obj.reasonCodes = reasons or ["Heuristic"]
                _BY_ID[lid] = obj

# ============================================================================
# SCORES REPOSITORY
# ============================================================================

def insert_score(vehicle_key: str, vin: str, score: int, buy_max: float, reasons: list[str]):
    """Insert a new score record (used during ingestion)"""
    if not DB_ENABLED:
        return
    with get_db_connection() as conn:
        if not conn:
            return
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into scores (vehicle_key, vin, score, buy_max, reason_codes)
                values (%s, %s, %s, %s, %s)
                """,
                (vehicle_key, vin, score, buy_max, reasons or ["Heuristic"]),
            )


def update_score(vehicle_key: str, vin: str, score: int, buy_max: float, reasons: list[str]):
    """Update the latest score record for a vehicle (used during updates)"""
    if not DB_ENABLED:
        return
    with get_db_connection() as conn:
        if not conn:
            return
        with conn.cursor() as cur:
            # Update the most recent score record for this vehicle_key
            # If no record exists, insert a new one
            cur.execute(
                """
                WITH latest_score AS (
                    SELECT id 
                    FROM scores 
                    WHERE vehicle_key = %s 
                    ORDER BY created_at DESC, id DESC 
                    LIMIT 1
                )
                UPDATE scores 
                SET score = %s, 
                    buy_max = %s, 
                    reason_codes = %s,
                    created_at = NOW()
                WHERE id IN (SELECT id FROM latest_score)
                """,
                (vehicle_key, score, buy_max, reasons or ["Heuristic"]),
            )
            # If no rows were updated (no existing record), insert a new one
            if cur.rowcount == 0:
                cur.execute(
                    """
                    insert into scores (vehicle_key, vin, score, buy_max, reason_codes)
                    values (%s, %s, %s, %s, %s)
                    """,
                    (vehicle_key, vin, score, buy_max, reasons or ["Heuristic"]),
                )


# ============================================================================
# VEHICLES REPOSITORY
# ============================================================================

def upsert_vehicle(vehicle_key: str, vin: str, year: int, make: str, model: str, trim: str | None):
    # Deprecated: the vehicles table was merged into listings in migration 019.
    # year/make/model/trim now live on listings rows directly. This function is
    # kept as a no-op so legacy callers (refactor_vehicles.py) don't crash.
    logging.warning("upsert_vehicle() is a no-op since migration 019; vehicle_key=%s", vehicle_key)
    return


# ============================================================================
# TRENDS REPOSITORY
# ============================================================================

def get_trends_data(days_back: int = 30) -> dict:
    """Get trend data comparing current period vs previous period"""
    if not DB_ENABLED:
        return {
            "total_listings": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "average_price": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "conversion_rate": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "active_buyers": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "average_profit": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "aged_inventory": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
        }
    
    with get_db_connection() as conn:
        if not conn:
            return {
                "total_listings": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "average_price": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "conversion_rate": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "active_buyers": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "average_profit": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "aged_inventory": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            }
        
        with conn.cursor() as cur:
            # Calculate date ranges
            cur.execute("SELECT NOW() as now")
            now = cur.fetchone()[0]
            
            # Current period: last N days
            current_start = now - datetime.timedelta(days=days_back)
            # Previous period: N days before that
            previous_start = now - datetime.timedelta(days=days_back * 2)
            previous_end = current_start
            
            # Query for current period metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_listings,
                    AVG(l.price) as avg_price,
                    COUNT(DISTINCT l.buyer_id) as active_buyers,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    COUNT(CASE WHEN l.created_at < %s THEN 1 END) as aged_inventory
                FROM listings l
                LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score
                    FROM scores
                    ORDER BY vin, created_at DESC
                ) s ON s.vin = l.vin
                WHERE l.created_at >= %s
            """, (now - datetime.timedelta(days=30), current_start))
            
            current_result = cur.fetchone()
            current_total, current_avg_price, current_buyers, current_scored, current_aged = current_result or (0, 0, 0, 0, 0)
            current_conversion = (current_scored / current_total * 100) if current_total > 0 else 0
            current_profit = float(current_avg_price) * 0.15 if current_avg_price else 0
            
            # Query for previous period metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_listings,
                    AVG(l.price) as avg_price,
                    COUNT(DISTINCT l.buyer_id) as active_buyers,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    COUNT(CASE WHEN l.created_at < %s THEN 1 END) as aged_inventory
                FROM listings l
                LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score
                    FROM scores
                    ORDER BY vin, created_at DESC
                ) s ON s.vin = l.vin
                WHERE l.created_at >= %s AND l.created_at < %s
            """, (now - datetime.timedelta(days=30), previous_start, previous_end))
            
            previous_result = cur.fetchone()
            previous_total, previous_avg_price, previous_buyers, previous_scored, previous_aged = previous_result or (0, 0, 0, 0, 0)
            previous_conversion = (previous_scored / previous_total * 100) if previous_total > 0 else 0
            previous_profit = float(previous_avg_price) * 0.15 if previous_avg_price else 0
            
            def calculate_trend(current: float, previous: float) -> tuple[float, bool]:
                if previous == 0:
                    return (100.0 if current > 0 else 0.0, current > 0)
                change = ((current - previous) / previous) * 100
                return (abs(change), change > 0)
            
            # Calculate trends for each metric
            total_trend, total_up = calculate_trend(current_total, previous_total)
            price_trend, price_up = calculate_trend(current_avg_price or 0, previous_avg_price or 0)
            conversion_trend, conversion_up = calculate_trend(current_conversion, previous_conversion)
            buyers_trend, buyers_up = calculate_trend(current_buyers, previous_buyers)
            profit_trend, profit_up = calculate_trend(current_profit, previous_profit)
            aged_trend, aged_up = calculate_trend(current_aged, previous_aged)
            
            return {
                "total_listings": {
                    "current": int(current_total),
                    "previous": int(previous_total),
                    "trend": round(total_trend, 1),
                    "trend_up": total_up
                },
                "average_price": {
                    "current": round(float(current_avg_price or 0), 2),
                    "previous": round(float(previous_avg_price or 0), 2),
                    "trend": round(price_trend, 1),
                    "trend_up": price_up
                },
                "conversion_rate": {
                    "current": round(current_conversion, 1),
                    "previous": round(previous_conversion, 1),
                    "trend": round(conversion_trend, 1),
                    "trend_up": conversion_up
                },
                "active_buyers": {
                    "current": int(current_buyers),
                    "previous": int(previous_buyers),
                    "trend": round(buyers_trend, 1),
                    "trend_up": buyers_up
                },
                "average_profit": {
                    "current": round(current_profit, 2),
                    "previous": round(previous_profit, 2),
                    "trend": round(profit_trend, 1),
                    "trend_up": profit_up
                },
                "aged_inventory": {
                    "current": int(current_aged),
                    "previous": int(previous_aged),
                    "trend": round(aged_trend, 1),
                    "trend_up": aged_up
                }
            }


# ============================================================================
# KPI REPOSITORY
# ============================================================================

def get_kpi_metrics() -> dict:
    """Get comprehensive KPI metrics for the dashboard"""
    if not DB_ENABLED:
        return {
            "average_profit_per_unit": 0.0,
            "lead_to_purchase_time": 0.0,
            "aged_inventory": 0,
            "total_listings": 0,
            "active_buyers": 0,
            "conversion_rate": 0.0,
            "average_price": 0.0,
            "total_value": 0.0,
            "scoring_rate": 0.0,
            "average_score": 0.0
        }
    
    with get_db_connection() as conn:
        if not conn:
            return {
                "average_profit_per_unit": 0.0,
                "lead_to_purchase_time": 0.0,
                "aged_inventory": 0,
                "total_listings": 0,
                "active_buyers": 0,
                "conversion_rate": 0.0,
                "average_price": 0.0,
                "total_value": 0.0,
                "scoring_rate": 0.0,
                "average_score": 0.0
            }
        
        with conn.cursor() as cur:
            # Get current timestamp for calculations
            cur.execute("SELECT NOW() as now")
            now = cur.fetchone()[0]
            
            # Calculate 30 days ago for aged inventory
            thirty_days_ago = now - datetime.timedelta(days=30)
            
            # Main metrics query
            cur.execute("""
                SELECT 
                    COUNT(*) as total_listings,
                    COALESCE(AVG(l.price), 0) as average_price,
                    COALESCE(SUM(l.price), 0) as total_value,
                    COUNT(DISTINCT l.buyer_id) as active_buyers,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    COALESCE(AVG(CASE WHEN s.score IS NOT NULL THEN s.score ELSE NULL END), 0) as average_score,
                    COUNT(CASE WHEN l.created_at < %s THEN 1 END) as aged_inventory,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400), 0) as avg_days_since_creation
                FROM listings l
                LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score
                    FROM scores
                    ORDER BY vin, created_at DESC
                ) s ON s.vin = l.vin
            """, (thirty_days_ago,))
            
            result = cur.fetchone()
            if not result:
                return {
                    "average_profit_per_unit": 0.0,
                    "lead_to_purchase_time": 0.0,
                    "aged_inventory": 0,
                    "total_listings": 0,
                    "active_buyers": 0,
                    "conversion_rate": 0.0,
                    "average_price": 0.0,
                    "total_value": 0.0,
                    "scoring_rate": 0.0,
                    "average_score": 0.0
                }
            
            (total_listings, average_price, total_value, active_buyers, 
             scored_listings, average_score, aged_inventory, avg_days_since_creation) = result
            
            # Calculate derived metrics
            average_profit_per_unit = float(average_price) * 0.15  # 15% margin
            lead_to_purchase_time = float(avg_days_since_creation) if avg_days_since_creation else 0.0
            conversion_rate = (scored_listings / total_listings * 100) if total_listings > 0 else 0.0
            scoring_rate = (scored_listings / total_listings * 100) if total_listings > 0 else 0.0
            
            return {
                "average_profit_per_unit": round(float(average_profit_per_unit), 2),
                "lead_to_purchase_time": round(float(lead_to_purchase_time), 1),
                "aged_inventory": int(aged_inventory),
                "total_listings": int(total_listings),
                "active_buyers": int(active_buyers),
                "conversion_rate": round(float(conversion_rate), 1),
                "average_price": round(float(average_price), 2),
                "total_value": round(float(total_value), 2),
                "scoring_rate": round(float(scoring_rate), 1),
                "average_score": round(float(average_score), 1)
            }
