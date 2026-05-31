import json
import tempfile
from pathlib import Path
from typing import Any, Dict

import wandb


def default_plan() -> Dict[str, Any]:
    return {
        "request": {
            "origin": "PHX",
            "destination": "San Francisco",
            "start_date": "2026-07-10",
            "end_date": "2026-07-14",
            "travelers": 2,
            "currency": "USD",
            "preferences": {
                "pace": "balanced",
                "budget_level": "moderate",
                "interests": ["food", "city views", "museums", "walkable areas"],
            },
        },
        "flight": {},
        "lodging": {},
        "transport": {},
        "attractions": {},
        "savings": {},
        "group": {},
        "routing": {},
        "budget": {},
        "cost_efficient": {},
        "summary": {},
    }


def load_local_plan(plan_file: str) -> Dict[str, Any]:
    path = Path("outputs") / plan_file
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default_plan()


def save_local_plan(plan: Dict[str, Any], plan_file: str) -> Path:
    out_dir = Path("outputs")
    out_dir.mkdir(exist_ok=True)
    path = out_dir / plan_file
    path.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    return path


def publish_plan(run: wandb.sdk.wandb_run.Run, artifact_name: str, plan_file: str, plan: Dict[str, Any]) -> None:
    path = save_local_plan(plan, plan_file)
    artifact = wandb.Artifact(artifact_name, type="travel-plan")
    artifact.add_file(str(path), name=plan_file)
    run.log_artifact(artifact)


def read_latest_plan(entity: str, project: str, artifact_name: str, plan_file: str) -> Dict[str, Any]:
    api = wandb.Api()
    artifact_ref = f"{entity}/{project}/{artifact_name}:latest"
    artifact = api.artifact(artifact_ref, type="travel-plan")
    with tempfile.TemporaryDirectory() as tmp:
        artifact_dir = Path(artifact.download(root=tmp))
        path = artifact_dir / plan_file
        if not path.exists():
            return default_plan()
        return json.loads(path.read_text(encoding="utf-8"))


def read_or_default_plan(cfg: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return read_latest_plan(cfg["entity"], cfg["project"], cfg["plan_artifact"], cfg["plan_file"])
    except Exception:
        return load_local_plan(cfg["plan_file"])
