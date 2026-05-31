import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    categories = ["flight", "lodging", "transport", "attractions"]
    subtotal = sum(float(plan.get(cat, {}).get("estimated_total", 0)) for cat in categories)
    meals = 70 * int(req.get("travelers", 1)) * 4
    contingency = round((subtotal + meals) * 0.12, 2)
    total = round(subtotal + meals + contingency, 2)
    plan["budget"] = {
        "category_totals": {cat: plan.get(cat, {}).get("estimated_total", 0) for cat in categories},
        "meals_estimated_total": meals,
        "contingency": contingency,
        "estimated_trip_total": total,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"budget_estimated_trip_total": total, "budget_contingency": contingency}, "calculated overall trip budget"


if __name__ == "__main__":
    run_agent("budget", "budget", update)
