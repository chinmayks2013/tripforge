import json
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

import wandb


def publish_message(run: wandb.sdk.wandb_run.Run, artifact_name: str, message_file: str,
                    sender: str, receiver: str, payload: Dict[str, Any]) -> None:
    """Append a message to a local JSONL file and log it as a W&B artifact version.

    This is intentionally simple. For high-throughput systems, use a real queue
    such as Redis, Kafka, or Pub/Sub and log summaries/artifacts to W&B.
    """
    out_dir = Path("outputs")
    out_dir.mkdir(exist_ok=True)
    path = out_dir / message_file
    message = {
        "ts": time.time(),
        "sender": sender,
        "receiver": receiver,
        "payload": payload,
    }
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(message) + "\n")

    artifact = wandb.Artifact(artifact_name, type="agent-messages")
    artifact.add_file(str(path), name=message_file)
    run.log_artifact(artifact)
    run.log({"messages_published": 1})


def read_latest_messages(entity: str, project: str, artifact_name: str, message_file: str,
                         receiver: str | None = None) -> List[Dict[str, Any]]:
    """Download the latest message artifact and return messages, optionally filtered by receiver."""
    api = wandb.Api()
    artifact_ref = f"{entity}/{project}/{artifact_name}:latest"
    artifact = api.artifact(artifact_ref, type="agent-messages")
    with tempfile.TemporaryDirectory() as tmp:
        artifact_dir = Path(artifact.download(root=tmp))
        path = artifact_dir / message_file
        if not path.exists():
            return []
        messages = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if receiver:
        messages = [m for m in messages if m.get("receiver") in {receiver, "all"}]
    return messages


def log_messages_table(run: wandb.sdk.wandb_run.Run, messages: List[Dict[str, Any]]) -> None:
    table = wandb.Table(columns=["ts", "sender", "receiver", "payload"])
    for msg in messages:
        table.add_data(msg.get("ts"), msg.get("sender"), msg.get("receiver"), json.dumps(msg.get("payload", {})))
    run.log({"agent_messages": table})
