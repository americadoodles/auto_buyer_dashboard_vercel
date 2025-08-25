from typing import Tuple, List
from schemas.listing import ListingScoreIn

def score_listing(item: ListingScoreIn) -> Tuple[int, float, List[str]]:
    reasons: list[str] = []
    dom_penalty = max(0, 30 - item.dom) / 30
    miles_penalty = max(0, 100_000 - item.miles) / 100_000
    base = 40 * dom_penalty + 40 * miles_penalty

    price_boost = 0
    if item.price < 25_000:
        price_boost = min(20, (25_000 - item.price) / 1000)
        reasons.append("PriceVsBaseline")
    if item.dom < 20: reasons.append("LowDOM")
    if item.miles < 50_000: reasons.append("LowMiles")

    score_val = int(max(0, min(100, base + price_boost)))
    buy_max = max(0.0, item.price * 1.03)
    if item.dom > 45:
        buy_max = item.price * 0.98
        reasons.append("AgedInventory")
    return score_val, round(buy_max, 2), reasons or ["Heuristic"]
