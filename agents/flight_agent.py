import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    travelers = int(req.get("travelers", 1))
    estimate_per_person = 320
    total = estimate_per_person * travelers
    plan["flight"] = {
        "origin": req.get("origin"),
        "destination": req.get("destination"),
        "preferred_windows": ["early morning outbound", "evening return"],
        "recommended_strategy": "Track nonstop and one-stop fares; book when price drops below target.",
        "estimated_total": total,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"flight_estimated_total": total}, f"estimated flights at {total} {req.get('currency', 'USD')}"


if __name__ == "__main__":
    run_agent("flight", "flight", update)
