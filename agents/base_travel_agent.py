import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from typing import Any, Dict

import wandb

from shared_bus import publish_message, read_latest_messages, log_messages_table
from travel_state import publish_plan, read_or_default_plan
from wandb_utils import load_project_config, login_if_key_present


def run_agent(agent_name: str, receiver: str, update_fn) -> None:
    cfg = load_project_config()
    login_if_key_present()

    with wandb.init(
        entity=cfg["entity"],
        project=cfg["project"],
        group=cfg.get("group"),
        job_type=f"{agent_name}-agent",
    ) as run:
        try:
            messages = read_latest_messages(
                cfg["entity"], cfg["project"], cfg["message_artifact"], cfg["message_file"], receiver=receiver
            )
            log_messages_table(run, messages)
            run.log({"messages_seen": len(messages)})
        except Exception as exc:
            print(f"No existing message artifact yet: {exc}")

        plan = read_or_default_plan(cfg)
        updated_plan, metrics, note = update_fn(plan)
        publish_plan(run, cfg["plan_artifact"], cfg["plan_file"], updated_plan)
        if metrics:
            wandb.log(metrics)

        publish_message(
            run=run,
            artifact_name=cfg["message_artifact"],
            message_file=cfg["message_file"],
            sender=agent_name,
            receiver="coordinator",
            payload={"agent": agent_name, "status": "done", "note": note, "metrics": metrics},
        )
        print(f"{agent_name} complete: {note}")
