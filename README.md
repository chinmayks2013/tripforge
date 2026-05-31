# TravelRook W&B Multi-Agent Template

This repo is configured for your TravelRook agents:

- `flight_agent.py` estimates flight strategy and flight cost.
- `lodging_agent.py` estimates hotel/lodging needs.
- `transport_agent.py` estimates local transport.
- `attractions_agent.py` builds an attraction mix.
- `savings_agent.py` identifies cost-saving actions.
- `group_agent.py` handles group coordination and cost-splitting rules.
- `routing_agent.py` creates a route/day structure.
- `budget_agent.py` combines category costs into a budget.
- `cost_efficient_agent.py` produces the optimized final plan.
- `coordinator_agent.py` publishes tasks to all agents.
- `shared_bus.py` is the W&B artifact-backed message bus.
- `travel_state.py` stores and versions the shared travel plan as a W&B Artifact.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

```bash
WANDB_ENTITY=your_wandb_username_or_team
WANDB_PROJECT=travelrook-agents
WANDB_API_KEY=your_api_key_here
```

You may also run `wandb login` manually instead of storing an API key.

## Run the full local pipeline

```bash
bash scripts/run_all_local.sh
```

This creates separate W&B runs for the coordinator and each TravelRook agent. Each agent reads the latest travel-plan artifact, updates its section, logs metrics, and publishes a completion message.

## Run with a custom trip request

Pass either a JSON string or a JSON file path to the coordinator:

```bash
python agents/coordinator_agent.py --request-json '{"origin":"PHX","destination":"New York City","start_date":"2026-08-01","end_date":"2026-08-05","travelers":3}'
```

Then run the agents:

```bash
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
```

## How communication works

1. The coordinator creates the initial `travelrook-plan` artifact and publishes task messages.
2. Each agent downloads the latest plan artifact, updates its own section, logs metrics to W&B, and republishes the plan artifact.
3. `shared_bus.py` logs JSONL messages as a W&B Artifact and W&B Table for traceability.
4. `read_final_plan.py` downloads and prints the latest final plan.

## Notes

The artifact-backed message bus is simple and good for demos, traceability, and low-frequency handoffs. For production TravelRook orchestration, keep W&B for runs, metrics, artifacts, tables, and audit trails, and use a real queue/database such as Redis, Kafka, RabbitMQ, Postgres, or a cloud queue for high-throughput communication.
