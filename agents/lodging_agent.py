import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from datetime import date

from agents.base_travel_agent import run_agent


def nights(start_date: str, end_date: str) -> int:
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
        return max((end - start).days, 1)
    except Exception:
        return 1


def update(plan):
    req = plan["request"]
    n = nights(req.get("start_date", "2026-07-10"), req.get("end_date", "2026-07-14"))
    nightly = 180
    total = nightly * n
    plan["lodging"] = {
        "nights": n,
        "recommended_area": "central, transit-accessible neighborhood",
        "room_strategy": "Choose refundable hotel first, then recheck rates weekly.",
        "estimated_nightly": nightly,
        "estimated_total": total,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"lodging_estimated_total": total, "lodging_nights": n}, f"estimated lodging for {n} nights"


if __name__ == "__main__":
    run_agent("lodging", "lodging", update)
