"""Blocked people are left out of discover_profiles results."""

from __future__ import annotations

import uuid

import pytest

pytestmark = pytest.mark.integration


def _create_user(admin_client, *, email: str):
    return admin_client.auth.admin.create_user(
        {
            "email": email,
            "password": "password123",
            "email_confirm": True,
        }
    ).user


def test_blocked_user_is_hidden_from_discover(admin_client):
    viewer = _create_user(admin_client, email=f"viewer_{uuid.uuid4().hex[:8]}@example.com")
    blocked = _create_user(admin_client, email=f"blocked_{uuid.uuid4().hex[:8]}@example.com")
    other = _create_user(admin_client, email=f"other_{uuid.uuid4().hex[:8]}@example.com")
    ids = [viewer.id, blocked.id, other.id]

    try:
        for user_id in ids:
            admin_client.table("users").update(
                {"is_active": True, "visible_in_everyone": True}
            ).eq("id", user_id).execute()

        admin_client.table("user_blocks").insert(
            {"blocker_id": viewer.id, "blocked_id": blocked.id}
        ).execute()

        rows = (
            admin_client.rpc(
                "discover_profiles",
                {
                    "viewer_id": viewer.id,
                    "include_everyone": True,
                    "pool_ids": [],
                },
            )
            .execute()
            .data
        )
        found = {row["id"] for row in rows}
        assert blocked.id not in found
        assert other.id in found
        assert viewer.id not in found
    finally:
        admin_client.table("user_blocks").delete().eq("blocker_id", viewer.id).execute()
        for user_id in ids:
            admin_client.auth.admin.delete_user(user_id)
