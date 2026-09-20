"""handle_new_user copies the Google name onto public.users.display_name once."""

from __future__ import annotations

import uuid

import pytest

pytestmark = pytest.mark.integration


def _create_auth_user(admin_client, *, email: str, user_metadata: dict | None = None):
    attrs = {
        "email": email,
        "password": "password123",
        "email_confirm": True,
    }
    if user_metadata is not None:
        attrs["user_metadata"] = user_metadata
    return admin_client.auth.admin.create_user(attrs).user


def _display_name(admin_client, user_id: str) -> str | None:
    profile = (
        admin_client.table("users")
        .select("display_name")
        .eq("id", user_id)
        .execute()
    )
    assert profile.data, f"missing public.users row for {user_id}"
    return profile.data[0]["display_name"]


def test_google_full_name_becomes_display_name_on_signup(admin_client):
    email = f"google_name_{uuid.uuid4().hex[:8]}@example.com"
    user = _create_auth_user(
        admin_client,
        email=email,
        user_metadata={
            "iss": "https://accounts.google.com",
            "full_name": "Ada Lovelace",
            "name": "Ada Lovelace",
            "given_name": "Ada",
        },
    )
    try:
        assert _display_name(admin_client, user.id) == "Ada Lovelace"
    finally:
        admin_client.auth.admin.delete_user(user.id)


def test_google_name_used_when_full_name_missing(admin_client):
    email = f"google_name_{uuid.uuid4().hex[:8]}@example.com"
    user = _create_auth_user(
        admin_client,
        email=email,
        user_metadata={"name": "  Grace Hopper  "},
    )
    try:
        assert _display_name(admin_client, user.id) == "Grace Hopper"
    finally:
        admin_client.auth.admin.delete_user(user.id)


def test_signup_without_oauth_name_leaves_display_name_empty(admin_client):
    email = f"no_name_{uuid.uuid4().hex[:8]}@example.com"
    user = _create_auth_user(admin_client, email=email, user_metadata={})
    try:
        assert _display_name(admin_client, user.id) is None
    finally:
        admin_client.auth.admin.delete_user(user.id)
