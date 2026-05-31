#!/usr/bin/env python3
"""Create the W&B project and send a test run so Weave is not empty."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env.local")
load_dotenv()

key = os.getenv("WANDB_API_KEY")
if not key:
    print("Add WANDB_API_KEY to .env.local first.", file=sys.stderr)
    sys.exit(1)

os.environ["WANDB_API_KEY"] = key

import wandb
from wandb_utils import load_project_config, login_if_key_present

login_if_key_present()
cfg = load_project_config()
entity = cfg["entity"]
project = cfg["project"]

# Resolve entity from logged-in account if configured name doesn't exist
api = wandb.Api()
viewer = api.viewer
if viewer and getattr(viewer, "username", None):
    resolved = viewer.username
    if entity != resolved:
        print(f"Note: WANDB_ENTITY={entity} -> using logged-in user '{resolved}'")
        entity = resolved

with wandb.init(
    entity=entity,
    project=project,
    job_type="bootstrap",
    name="travelrooks-bootstrap",
) as run:
    run.log({"status": "TravelRooks connected", "weave": True})
    url = f"https://wandb.ai/{entity}/{project}"
    weave_url = f"{url}/weave"
    print(f"W&B project ready: {url}")
    print(f"Weave UI: {weave_url}")
    print(f"Run ID: {run.id}")
