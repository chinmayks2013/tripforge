import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    plan["routing"] = {
        "daily_structure": [
            "Day 1: arrival, check-in, nearby dinner",
            "Day 2: central attractions and walkable neighborhoods",
            "Day 3: museum/cultural block plus viewpoint",
            "Day 4: flexible morning, departure buffer",
        ],
        "route_principles": [
            "cluster stops by neighborhood",
            "avoid crossing the city more than twice per day",
            "keep one weather-flexible indoor option daily",
        ],
    }
    return plan, {"routing_days_planned": 4}, "built route structure"


if __name__ == "__main__":
    run_agent("routing", "routing", update)
