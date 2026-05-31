import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    travelers = int(req.get("travelers", 1))
    plan["group"] = {
        "travelers": travelers,
        "coordination_rules": [
            "keep one shared confirmation folder",
            "collect dietary/accessibility constraints before reservations",
            "split fixed costs by traveler count",
            "assign one owner for flights, lodging, and daily itinerary",
        ],
        "split_strategy": "equal split for lodging and transport; individual split for flights and personal meals",
    }
    return plan, {"group_travelers": travelers}, "created group coordination plan"


if __name__ == "__main__":
    run_agent("group", "group", update)
