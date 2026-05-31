import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from agents.base_travel_agent import run_agent


def update(plan):
    req = plan["request"]
    budget_total = float(plan.get("budget", {}).get("estimated_trip_total", 0))
    savings = float(plan.get("savings", {}).get("estimated_savings", 0))
    optimized_total = max(budget_total - savings, 0)
    plan["cost_efficient"] = {
        "optimized_total": optimized_total,
        "currency": req.get("currency", "USD"),
        "priority_order": [
            "book flights below target fare",
            "stay near transit to reduce rideshare costs",
            "mix paid and free attractions",
            "batch activities by neighborhood",
        ],
        "tradeoff_note": "This favors value and convenience over the absolute cheapest option.",
    }
    plan["summary"] = {
        "destination": req.get("destination"),
        "dates": f"{req.get('start_date')} to {req.get('end_date')}",
        "estimated_total_before_savings": budget_total,
        "estimated_savings": savings,
        "optimized_total": optimized_total,
        "currency": req.get("currency", "USD"),
    }
    return plan, {"cost_efficient_optimized_total": optimized_total}, "created cost-efficient final summary"


if __name__ == "__main__":
    run_agent("cost_efficient", "cost_efficient", update)
