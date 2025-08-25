from schemas.notify import NotifyItem

_NOTIFICATIONS: list[dict[str, str]] = []

def notify(it: NotifyItem) -> dict:
    vin = (it.vin or "").strip().upper()
    msg = it.message or f"Notify for VIN {vin}"
    ch = it.channel or "email"
    _NOTIFICATIONS.append({"vin": vin, "channel": ch, "message": msg})
    return {"vin": vin, "notified": True, "channel": ch}
