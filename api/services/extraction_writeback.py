# Extraction write-back — applies identifiers the damage-detection agent reads
# from listing photos (VIN, license plate, phone numbers) to the listings and
# contacts tables.
#
# Safety policy (OCR output never tramples human-entered data):
#   * FILL-ONLY-WHEN-EMPTY — a field is written only when currently NULL/empty.
#   * VINs must pass strict validation (17 chars, no I/O/Q); raw transcriptions
#     are never written.
#   * Mismatches with existing data are reported as conflicts, not written.
#   * A contact is created only when the listing has no linked contact AND a
#     plausible phone number was extracted; it is clearly labeled as
#     agent-extracted so humans can review it.
#
# Every action taken is returned (and stored inside the damage report) for
# auditability; listings.updated_by records the agent as the author.

from typing import Any, Dict, List, Optional
import logging
import re

from psycopg.rows import dict_row

from ..core.db_helpers import execute_with_connection

logger = logging.getLogger(__name__)

AGENT_AUTHOR = "damage-detection-agent"

_VIN_RE = re.compile(r"^[A-HJ-NPR-Z0-9]{17}$")


def _clean_id(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    cleaned = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    return cleaned or None


def _clean_state(value: Optional[str]) -> Optional[str]:
    """A plate state is already normalized to a 2-letter code upstream; keep
    only a well-formed code so OCR noise never reaches the listings table."""
    if not value:
        return None
    code = re.sub(r"[^A-Za-z]", "", str(value)).upper()
    return code if len(code) == 2 else None


def _plausible_phone(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    return 10 <= len(digits) <= 15


def apply_extractions(listing_id: int, extracted: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Apply extracted identifiers to listings/contacts per the safety policy.

    Returns a write-back summary {actions: [...], conflicts: [...]} describing
    exactly what was changed, or None when there was nothing to apply.
    Never raises on data problems — failures are logged and reported.
    """
    vin = _clean_id(extracted.get("vin"))
    if vin and not _VIN_RE.match(vin):
        vin = None  # defense in depth — upstream validates too
    plate = _clean_id(extracted.get("license_plate"))
    plate_state = _clean_state(extracted.get("license_plate_state"))
    phones = [p for p in (extracted.get("phone_numbers") or []) if _plausible_phone(str(p))]
    contact_text = next(iter(extracted.get("contact_text") or []), None)

    if not (vin or plate or plate_state or phones):
        return None

    row = execute_with_connection(
        "SELECT vin, lpn, lpn_state, contact_id FROM listings WHERE id = %s",
        (listing_id,),
        fetch="one",
        row_factory=dict_row,
    )
    if row is None:
        logger.warning("Write-back: listing %s not found", listing_id)
        return None
    row = dict(row)

    actions: List[str] = []
    conflicts: List[str] = []
    listing_sets: List[str] = []
    listing_params: List[Any] = []

    # ---- listings.vin ----
    if vin:
        existing = _clean_id(row.get("vin"))
        if not existing:
            listing_sets.append("vin = %s")
            listing_params.append(vin)
            actions.append(f"listings.vin filled: {vin}")
        elif existing != vin:
            conflicts.append(f"vin mismatch: photos show {vin}, listing has {existing}")

    # ---- listings.lpn ----
    if plate:
        existing = _clean_id(row.get("lpn"))
        if not existing:
            listing_sets.append("lpn = %s")
            listing_params.append(plate)
            actions.append(f"listings.lpn filled: {plate}")
        elif existing != plate:
            conflicts.append(f"plate mismatch: photos show {plate}, listing has {existing}")

    # ---- listings.lpn_state ----
    if plate_state:
        existing = _clean_state(row.get("lpn_state"))
        if not existing:
            listing_sets.append("lpn_state = %s")
            listing_params.append(plate_state)
            actions.append(f"listings.lpn_state filled: {plate_state}")
        elif existing != plate_state:
            conflicts.append(f"plate state mismatch: photos show {plate_state}, listing has {existing}")

    if listing_sets:
        execute_with_connection(
            f"UPDATE listings SET {', '.join(listing_sets)}, updated_at = now(), updated_by = %s "
            f"WHERE id = %s",
            (*listing_params, AGENT_AUTHOR, listing_id),
        )

    # ---- contacts ----
    if phones:
        contact_id = row.get("contact_id")
        if contact_id:
            contact = execute_with_connection(
                "SELECT phone, mobile FROM contacts WHERE id = %s",
                (contact_id,),
                fetch="one",
                row_factory=dict_row,
            )
            if contact and not (contact["phone"] or contact["mobile"]):
                execute_with_connection(
                    "UPDATE contacts SET phone = %s, updated_at = now() WHERE id = %s",
                    (phones[0], contact_id),
                )
                actions.append(f"contacts.phone filled on linked contact: {phones[0]}")
            elif contact:
                existing_phones = {re.sub(r"\D", "", p) for p in (contact["phone"], contact["mobile"]) if p}
                if re.sub(r"\D", "", phones[0]) not in existing_phones:
                    conflicts.append(
                        f"phone mismatch: photos show {phones[0]}, contact already has one"
                    )
        else:
            # No linked contact — create one, clearly labeled for human review.
            note = f"Auto-created by {AGENT_AUTHOR} from listing #{listing_id} photos."
            if contact_text:
                note += f" Visible contact text: {contact_text!r}"
            new_id_row = execute_with_connection(
                """
                INSERT INTO contacts (first_name, last_name, phone, notes)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                ("Unknown", "Seller (photo-extracted)", phones[0], note),
                fetch="one",
            )
            if new_id_row:
                execute_with_connection(
                    "UPDATE listings SET contact_id = %s, updated_at = now(), updated_by = %s "
                    "WHERE id = %s",
                    (new_id_row[0], AGENT_AUTHOR, listing_id),
                )
                actions.append(f"contact created ({new_id_row[0]}) with phone {phones[0]} and linked to listing")

    if not actions and not conflicts:
        return None
    summary = {"actions": actions, "conflicts": conflicts, "author": AGENT_AUTHOR}
    logger.info("Write-back listing %s: %s", listing_id, summary)
    return summary
