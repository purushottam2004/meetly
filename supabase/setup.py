#!/usr/bin/env python3
"""
Local Supabase bootstrap (cross-platform).

Prerequisites (run once in this folder):
    python -m venv .venv
    # macOS / Linux:
    source .venv/bin/activate
    # Windows:
    #   .venv\\Scripts\\activate
    pip install -r requirements.txt

Then:
    python setup.py
    python setup.py --skip-seed
"""

from __future__ import annotations

import argparse
import logging
import re
import shutil
import subprocess
import sys
from pathlib import Path

from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
ENV_FILE = SCRIPT_DIR / ".env"
ENV_EXAMPLE = SCRIPT_DIR / ".env.example"
SEED_SCRIPT = SCRIPT_DIR / "seed.py"

STATUS_KEYS = (
    "API_URL",
    "PUBLISHABLE_KEY",
    "SECRET_KEY",
    "STUDIO_URL",
    "DB_URL",
)


def require_cmd(name: str, hint: str = "") -> None:
    if shutil.which(name) is None:
        suffix = f" {hint}" if hint else ""
        logger.error("Missing required command: %s.%s", name, suffix)
        raise SystemExit(1)


def run(
    args: list[str],
    *,
    check: bool = True,
    capture: bool = False,
    quiet_stderr: bool = False,
) -> subprocess.CompletedProcess[str]:
    kwargs: dict = {
        "cwd": SCRIPT_DIR,
        "check": check,
        "text": True,
    }
    if capture and quiet_stderr:
        kwargs["stdout"] = subprocess.PIPE
        kwargs["stderr"] = subprocess.DEVNULL
    elif capture:
        kwargs["capture_output"] = True
    elif quiet_stderr:
        kwargs["stderr"] = subprocess.DEVNULL
    return subprocess.run(args, **kwargs)


def docker_running() -> bool:
    result = run(["docker", "info"], check=False, capture=True, quiet_stderr=True)
    return result.returncode == 0


def supabase_is_running() -> bool:
    result = run(["supabase", "status"], check=False, capture=True, quiet_stderr=True)
    return result.returncode == 0


def parse_status_env(raw: str) -> dict[str, str]:
    """Parse `supabase status -o env` KEY=\"value\" lines."""
    values: dict[str, str] = {}
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key not in STATUS_KEYS:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key] = value
    return values


def load_status_env() -> dict[str, str]:
    result = run(
        ["supabase", "status", "-o", "env"],
        capture=True,
        quiet_stderr=True,
    )
    return parse_status_env(result.stdout or "")


def upsert_env(path: Path, key: str, value: str) -> None:
    """Set KEY=VALUE in an env file, replacing an existing assignment if present."""
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    else:
        lines = []

    pattern = re.compile(rf"^{re.escape(key)}=")
    replaced = False
    new_lines: list[str] = []
    for line in lines:
        if not replaced and pattern.match(line):
            new_lines.append(f"{key}={value}\n")
            replaced = True
        else:
            new_lines.append(line if line.endswith("\n") else f"{line}\n")

    if not replaced:
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] = f"{new_lines[-1]}\n"
        new_lines.append(f"{key}={value}\n")

    path.write_text("".join(new_lines), encoding="utf-8")


def write_env(status: dict[str, str]) -> None:
    if not ENV_FILE.exists() and ENV_EXAMPLE.exists():
        ENV_FILE.write_text(ENV_EXAMPLE.read_text(encoding="utf-8"), encoding="utf-8")
        logger.info("Created .env from .env.example")

    api_url = status.get("API_URL", "")
    publishable = status.get("PUBLISHABLE_KEY", "")
    secret = status.get("SECRET_KEY", "")

    if not api_url:
        logger.error("Could not read API_URL from supabase status.")
        raise SystemExit(1)
    if not publishable:
        logger.error("Could not read PUBLISHABLE_KEY from supabase status.")
        raise SystemExit(1)
    if not secret:
        logger.error("Could not read SECRET_KEY from supabase status.")
        raise SystemExit(1)

    upsert_env(ENV_FILE, "SUPABASE_URL", api_url)
    upsert_env(ENV_FILE, "SUPABASE_PUBLISHABLE_KEY", publishable)
    upsert_env(ENV_FILE, "SUPABASE_SECRET_KEY", secret)
    logger.info("Wrote .env")


def run_seeds() -> None:
    if not SEED_SCRIPT.exists():
        logger.error("seed.py not found at %s", SEED_SCRIPT)
        raise SystemExit(1)
    run([sys.executable, str(SEED_SCRIPT)])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start local Supabase, write .env, and run Python seed scripts.",
    )
    parser.add_argument(
        "--skip-seed",
        action="store_true",
        help="Skip python seed.py (still starts stack and writes .env)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logger.info("Checking prerequisites")
    require_cmd("docker", "Install Docker Desktop / Docker Engine and start it.")
    require_cmd(
        "supabase",
        "Install the Supabase CLI: https://supabase.com/docs/guides/local-development/cli/getting-started",
    )

    if not docker_running():
        logger.error("Docker is installed but not running. Start Docker, then re-run setup.py.")
        raise SystemExit(1)
    logger.info("Prerequisites OK")

    load_dotenv(ENV_FILE)

    if supabase_is_running():
        logger.info("Supabase is already running")
    else:
        logger.info("Starting Supabase (first run may pull images and take a while)")
        run(["supabase", "start"])
    logger.info("Supabase is up")

    logger.info("Reading local credentials from supabase status")
    status = load_status_env()
    write_env(status)

    if args.skip_seed:
        logger.warning("Skipping seed.py (--skip-seed)")
    else:
        logger.info("Running Python seed scripts")
        run_seeds()
        logger.info("Seeding finished")

    logger.info(
        "Local Supabase is ready | API URL: %s | Studio: %s | DB URL: %s | Env: .env | Re-seed: python seed.py",
        status.get("API_URL", "n/a"),
        status.get("STUDIO_URL", "n/a"),
        status.get("DB_URL", "n/a"),
    )


if __name__ == "__main__":
    main()
