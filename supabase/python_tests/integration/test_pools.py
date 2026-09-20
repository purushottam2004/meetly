"""Pool visibility and discover_profiles filtering."""

from __future__ import annotations

import os
import uuid

import pytest
from supabase import create_client

from python_seeds.client import SUPABASE_URL

pytestmark = pytest.mark.integration

PASSWORD = "password123"


def _publishable_key() -> str:
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY") or ""
    if not key:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY is not set")
    return key


def test_everyone_default_and_pool_union_filter(admin_client):
    pool_id = str(uuid.uuid4())
    pool_name = f"CAMPUS{uuid.uuid4().hex[:8].upper()}"

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
                "name": pool_name,
                "join_code": pool_name,
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


def test_shared_pools_returns_visible_overlap_only(admin_client):
    suffix = uuid.uuid4().hex[:8].upper()
    pool_id = str(uuid.uuid4())
    hidden_pool_id = str(uuid.uuid4())
    email = f"overlap_{suffix.lower()}@example.com"
    other_email = f"overlap_b_{suffix.lower()}@example.com"

    viewer = admin_client.auth.admin.create_user(
        {"email": email, "password": PASSWORD, "email_confirm": True}
    ).user
    other = admin_client.auth.admin.create_user(
        {"email": other_email, "password": PASSWORD, "email_confirm": True}
    ).user

    try:
        admin_client.table("pools").insert(
            [
                {
                    "id": pool_id,
                    "name": f"SHARED{suffix}",
                    "join_code": f"SHARED{suffix}",
                    "created_by": viewer.id,
                },
                {
                    "id": hidden_pool_id,
                    "name": f"HIDDEN{suffix}",
                    "join_code": f"HIDDEN{suffix}",
                    "created_by": viewer.id,
                },
            ]
        ).execute()
        admin_client.table("pool_memberships").insert(
            [
                {"user_id": viewer.id, "pool_id": pool_id, "visible": True},
                {"user_id": other.id, "pool_id": pool_id, "visible": True},
                {"user_id": viewer.id, "pool_id": hidden_pool_id, "visible": True},
                {"user_id": other.id, "pool_id": hidden_pool_id, "visible": False},
            ]
        ).execute()

        client = create_client(SUPABASE_URL, _publishable_key())
        client.auth.sign_in_with_password({"email": email, "password": PASSWORD})
        names = {
            row["name"]
            for row in client.rpc("shared_pools", {"p_other_id": other.id}).execute().data
        }
        assert names == {f"SHARED{suffix}"}
    finally:
        admin_client.table("pools").delete().eq("id", pool_id).execute()
        admin_client.table("pools").delete().eq("id", hidden_pool_id).execute()
        admin_client.auth.admin.delete_user(viewer.id)
        admin_client.auth.admin.delete_user(other.id)


def _rpc_row(data):
    if isinstance(data, list):
        return data[0]
    return data


def test_create_pool_name_is_the_join_code(admin_client):
    suffix = uuid.uuid4().hex[:8].upper()
    name = f"POOL {suffix}"
    email = f"creator_{suffix.lower()}@example.com"
    joiner_email = f"joiner_{suffix.lower()}@example.com"

    creator = admin_client.auth.admin.create_user(
        {"email": email, "password": PASSWORD, "email_confirm": True}
    ).user
    joiner = admin_client.auth.admin.create_user(
        {"email": joiner_email, "password": PASSWORD, "email_confirm": True}
    ).user

    try:
        creator_client = create_client(SUPABASE_URL, _publishable_key())
        creator_client.auth.sign_in_with_password({"email": email, "password": PASSWORD})
        created = _rpc_row(
            creator_client.rpc("create_pool", {"p_name": name}).execute().data
        )
        assert created["name"] == name
        assert created["join_code"] == name

        joiner_client = create_client(SUPABASE_URL, _publishable_key())
        joiner_client.auth.sign_in_with_password(
            {"email": joiner_email, "password": PASSWORD}
        )
        joined = _rpc_row(
            joiner_client.rpc("join_pool", {"p_code": name.replace(" ", "")}).execute().data
        )
        assert joined["id"] == created["id"]
        assert joined["join_code"] == joined["name"]
    finally:
        admin_client.table("pools").delete().eq("name", name).execute()
        admin_client.auth.admin.delete_user(creator.id)
        admin_client.auth.admin.delete_user(joiner.id)


def test_member_can_leave_pool(admin_client):
    suffix = uuid.uuid4().hex[:8].upper()
    name = f"LEAVE {suffix}"
    email = f"leave_{suffix.lower()}@example.com"

    member = admin_client.auth.admin.create_user(
        {"email": email, "password": PASSWORD, "email_confirm": True}
    ).user

    try:
        client = create_client(SUPABASE_URL, _publishable_key())
        client.auth.sign_in_with_password({"email": email, "password": PASSWORD})
        created = _rpc_row(client.rpc("create_pool", {"p_name": name}).execute().data)

        client.table("pool_memberships").delete().eq("pool_id", created["id"]).execute()
        remaining = (
            admin_client.table("pool_memberships")
            .select("*")
            .eq("user_id", member.id)
            .eq("pool_id", created["id"])
            .execute()
            .data
        )
        assert remaining == []
    finally:
        admin_client.table("pools").delete().eq("name", name).execute()
        admin_client.auth.admin.delete_user(member.id)
