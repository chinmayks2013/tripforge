import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    estimated_savings = 145
    plan["savings"] = {
        "actions": [
            "use fare alerts before booking flights",
            "compare hotel refundable rates against short-stay rentals",
            "group attractions by area to reduce rideshare use",
            "reserve timed-entry attractions early when prices vary",
        ],
        "estimated_savings": estimated_savings,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"estimated_savings": estimated_savings}, "identified savings opportunities"


if __name__ == "__main__":
    run_agent("savings", "savings", update)
