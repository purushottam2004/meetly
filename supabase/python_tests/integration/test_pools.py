"""Pool visibility and discover_profiles filtering."""

from __future__ import annotations

import uuid

import pytest

pytestmark = pytest.mark.integration


def test_everyone_default_and_pool_union_filter(admin_client):
    pool_id = str(uuid.uuid4())
    code = uuid.uuid4().hex[:6].upper()

    hidden = admin_client.auth.admin.create_user(
        {
            "email": f"hidden_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "email_confirm": True,
        }
    ).user
    member = admin_client.auth.admin.create_user(
        {
            "email": f"member_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "email_confirm": True,
        }
    ).user
    hidden_id = hidden.id
    member_id = member.id

    try:
        admin_client.table("users").update(
            {"is_active": True, "visible_in_everyone": False}
        ).eq("id", hidden_id).execute()
        admin_client.table("users").update({"is_active": True, "visible_in_everyone": True}).eq(
            "id", member_id
        ).execute()

        admin_client.table("pools").insert(
            {
                "id": pool_id,
                "name": "Campus",
                "join_code": code,
                "created_by": member_id,
            }
        ).execute()
        admin_client.table("pool_memberships").insert(
            [
                {"user_id": hidden_id, "pool_id": pool_id, "visible": True},
                {"user_id": member_id, "pool_id": pool_id, "visible": True},
            ]
        ).execute()

        everyone = (
            admin_client.rpc(
                "discover_profiles",
                {
                    "viewer_id": member_id,
                    "include_everyone": True,
                    "pool_ids": [],
                },
            )
            .execute()
            .data
        )
        everyone_ids = {row["id"] for row in everyone}
        assert hidden_id not in everyone_ids
        assert member_id in everyone_ids

        pooled = (
            admin_client.rpc(
                "discover_profiles",
                {
                    "viewer_id": member_id,
                    "include_everyone": False,
                    "pool_ids": [pool_id],
                },
            )
            .execute()
            .data
        )
        pooled_ids = {row["id"] for row in pooled}
        assert hidden_id in pooled_ids
        assert member_id in pooled_ids

        unioned = (
            admin_client.rpc(
                "discover_profiles",
                {
                    "viewer_id": member_id,
                    "include_everyone": True,
                    "pool_ids": [pool_id],
                },
            )
            .execute()
            .data
        )
        union_ids = {row["id"] for row in unioned}
        assert hidden_id in union_ids
        assert member_id in union_ids
    finally:
        admin_client.table("pools").delete().eq("id", pool_id).execute()
        admin_client.auth.admin.delete_user(hidden_id)
        admin_client.auth.admin.delete_user(member_id)
