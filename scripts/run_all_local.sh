#!/usr/bin/env bash
set -e
python agents/coordinator_agent.py --task build_travel_plan
python agents/flight_agent.py
python agents/lodging_agent.py
python agents/transport_agent.py
python agents/attractions_agent.py
python agents/savings_agent.py
python agents/group_agent.py
python agents/routing_agent.py
python agents/budget_agent.py
python agents/cost_efficient_agent.py
python read_final_plan.py
