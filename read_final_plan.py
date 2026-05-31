import json

from travel_state import read_or_default_plan
from wandb_utils import load_project_config, login_if_key_present


def main() -> None:
    cfg = load_project_config()
    login_if_key_present()
    plan = read_or_default_plan(cfg)
    print(json.dumps(plan, indent=2))


if __name__ == "__main__":
    main()
