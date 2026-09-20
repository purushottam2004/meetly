"""Shared Supabase admin client for python_seeds scripts."""

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_SECRET_KEY = (
    os.getenv("SUPABASE_SECRET_KEY")
    or os.getenv("SUPABASE_SERVICE_KEY")
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    or ""
)


def get_supabase_admin_client() -> Client:
    """Create a Supabase client with the secret (service role) key."""
    if not SUPABASE_SECRET_KEY:
        raise ValueError(
            "SUPABASE_SECRET_KEY environment variable is required. "
            "You can find it by running: supabase status"
        )
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)


def _user_field(user: Any, field: str) -> Any:
    if isinstance(user, dict):
        return user.get(field)
    return getattr(user, field, None)


def list_auth_users(supabase: Client) -> list[Any]:
    response = supabase.auth.admin.list_users()
    if isinstance(response, list):
        return response
    if isinstance(response, dict):
        return response.get("users") or []
    users = getattr(response, "users", None)
    return list(users) if users else []


def get_auth_user_id_by_email(supabase: Client, email: str) -> str | None:
    for user in list_auth_users(supabase):
        if _user_field(user, "email") == email:
            user_id = _user_field(user, "id")
            return str(user_id) if user_id else None
    return None


def create_or_get_auth_user(supabase: Client, user_data: dict) -> str:
    """
    Create an auth user (auto-confirmed) or return the existing auth user id.
    public.users is filled by the handle_new_user trigger (no email column).
    If user_metadata has full_name / name / given_name, that becomes display_name.
    """
    email = user_data["email"]
    existing_id = get_auth_user_id_by_email(supabase, email)
    if existing_id:
        expected = user_data.get("id")
        if expected and str(existing_id) != str(expected):
            print(
                f"⚠ User already exists: {email} (ID: {existing_id}; "
                f"data file wants {expected} — reset + reseed to align)"
            )
        else:
            print(f"⚠ User already exists: {email} (ID: {existing_id})")
        return existing_id

    try:
        attrs = {
            "email": email,
            "password": user_data["password"],
            "email_confirm": True,
            "user_metadata": user_data.get("user_metadata", {}),
        }
        if user_data.get("id"):
            attrs["id"] = user_data["id"]
        response = supabase.auth.admin.create_user(attrs)
        user_id = response.user.id
        print(f"✓ Created user: {email} (ID: {user_id})")
        return user_id
    except Exception as e:
        error_msg = str(e)
        if "already been registered" not in error_msg and "already exists" not in error_msg:
            print(f"✗ Failed to create user {email}: {error_msg}")
            raise

        print(f"⚠ Auth user already exists: {email}")
        retry_id = get_auth_user_id_by_email(supabase, email)
        if retry_id:
            print(f"✓ Found existing user: {email} (ID: {retry_id})")
            return retry_id
        raise ValueError(f"User {email} exists in auth but could not be resolved") from e
