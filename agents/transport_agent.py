import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    travelers = int(req.get("travelers", 1))
    total = 35 * travelers + 70
    plan["transport"] = {
        "airport_transfer": "use rideshare only for arrival/departure if public transit is slow",
        "daily_strategy": "prioritize walking, public transit, and route batching",
        "estimated_total": total,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"transport_estimated_total": total}, "created local transport estimate"


if __name__ == "__main__":
    run_agent("transport", "transport", update)
