"""
Seed dummy auth users from python_seeds/data/_001_data_users.py.
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from python_seeds.client import (
    SUPABASE_URL,
    create_or_get_auth_user,
    get_supabase_admin_client,
)
from python_seeds.data import user as user_data


def seed_users():
    supabase = get_supabase_admin_client()
    print(f"Connecting to Supabase at: {SUPABASE_URL}")
    print(f"Seeding {len(user_data.SEED_USERS)} users...\n")

    for user in user_data.SEED_USERS:
        user_id = create_or_get_auth_user(supabase, user)
        profile = user.get("profile") or {}

        hours_since_active = profile.get("hours_since_active")
        last_active_at = None
        if hours_since_active is not None:
            last_active_at = (
                datetime.now(timezone.utc) - timedelta(hours=hours_since_active)
            ).isoformat()

        updates = {
            key: value
            for key, value in {
                "username": profile.get("username"),
                "display_name": profile.get("display_name"),
                "age": profile.get("age"),
                "headline": profile.get("headline"),
                "location_text": profile.get("location_text"),
                "latitude": profile.get("latitude"),
                "longitude": profile.get("longitude"),
                "last_active_at": last_active_at,
            }.items()
            if value is not None
        }
        if updates:
            supabase.table("users").update(updates).eq("id", user_id).execute()
            print(f"  Updated {user['email']}: {updates}")

    print("\nSeeding complete!")
    print(f"Shared password (from _001_data_users.py): {user_data.DEFAULT_PASSWORD}")
    for user in user_data.SEED_USERS:
        print(f"  {user['email']}")


if __name__ == "__main__":
    seed_users()
