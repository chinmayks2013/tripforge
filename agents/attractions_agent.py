import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    interests = req.get("preferences", {}).get("interests", [])
    paid_total = 160
    plan["attractions"] = {
        "interests_used": interests,
        "recommended_mix": [
            "one major paid attraction",
            "one museum or cultural stop",
            "two free viewpoints/walkable neighborhoods",
            "one food-market style experience",
        ],
        "estimated_total": paid_total,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"attractions_estimated_total": paid_total}, "built attractions mix"


if __name__ == "__main__":
    run_agent("attractions", "attractions", update)
