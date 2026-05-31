import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import argparse
import json
from pathlib import Path

import wandb

from shared_bus import log_messages_table, publish_message, read_latest_messages
from travel_state import default_plan, publish_plan
from wandb_utils import load_project_config, login_if_key_present


AGENTS = [
    "flight",
    "lodging",
    "transport",
    "attractions",
    "savings",
    "group",
    "routing",
    "budget",
    "cost_efficient",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="TravelRook coordinator agent.")
    parser.add_argument("--task", default="build_travel_plan", help="Task name to publish")
    parser.add_argument("--request-json", default="", help="Optional JSON string or path with trip request overrides")
    return parser.parse_args()


def load_request_override(value: str) -> dict:
    if not value:
        return {}
    path = Path(value)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return json.loads(value)


def deep_update(base: dict, updates: dict) -> dict:
    for key, value in updates.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_update(base[key], value)
        else:
            base[key] = value
    return base


def main() -> None:
    args = parse_args()
    cfg = load_project_config()
    login_if_key_present()

    plan = default_plan()
    override = load_request_override(args.request_json)
    if override:
        deep_update(plan["request"], override)

    with wandb.init(entity=cfg["entity"], project=cfg["project"], group=cfg.get("group"), job_type="coordinator-agent") as run:
        publish_plan(run, cfg["plan_artifact"], cfg["plan_file"], plan)
        for agent in AGENTS:
            publish_message(
                run=run,
                artifact_name=cfg["message_artifact"],
                message_file=cfg["message_file"],
                sender="coordinator",
                receiver=agent,
                payload={"task": args.task, "status": "requested", "agent": agent, "request": plan["request"]},
            )
        messages = read_latest_messages(cfg["entity"], cfg["project"], cfg["message_artifact"], cfg["message_file"])
        log_messages_table(run, messages)
        wandb.log({"agents_requested": len(AGENTS)})
        print(f"Published {args.task} to {len(AGENTS)} TravelRook agents.")


if __name__ == "__main__":
    main()
