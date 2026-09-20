"""Chosen and rejected people stay in discover_profiles results."""

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


def test_left_and_right_swipes_stay_in_discover(admin_client):
    viewer = _create_user(admin_client, email=f"viewer_{uuid.uuid4().hex[:8]}@example.com")
    rejected = _create_user(admin_client, email=f"rejected_{uuid.uuid4().hex[:8]}@example.com")
    chosen = _create_user(admin_client, email=f"chosen_{uuid.uuid4().hex[:8]}@example.com")
    fresh = _create_user(admin_client, email=f"fresh_{uuid.uuid4().hex[:8]}@example.com")
    ids = [viewer.id, rejected.id, chosen.id, fresh.id]

    try:
        for user_id in ids:
            admin_client.table("users").update(
                {"is_active": True, "visible_in_everyone": True}
            ).eq("id", user_id).execute()

        admin_client.table("swipes").insert(
            [
                {"swiper_id": viewer.id, "swiped_id": rejected.id, "direction": "left"},
                {"swiper_id": viewer.id, "swiped_id": chosen.id, "direction": "right"},
            ]
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
        assert rejected.id in found
        assert chosen.id in found
        assert fresh.id in found
        assert viewer.id not in found
    finally:
        admin_client.table("swipes").delete().eq("swiper_id", viewer.id).execute()
        for user_id in ids:
            admin_client.auth.admin.delete_user(user_id)
