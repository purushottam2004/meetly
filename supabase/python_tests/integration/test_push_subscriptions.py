"""RLS for Web Push subscription rows."""

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


def _create_user(admin_client, email: str):
    return admin_client.auth.admin.create_user(
        {
            "email": email,
            "password": PASSWORD,
            "email_confirm": True,
        }
    ).user


def _user_client(email: str):
    client = create_client(SUPABASE_URL, _publishable_key())
    client.auth.sign_in_with_password({"email": email, "password": PASSWORD})
    return client


def test_user_can_upsert_own_subscription_and_not_see_others(admin_client):
    email_a = f"push_a_{uuid.uuid4().hex[:8]}@example.com"
    email_b = f"push_b_{uuid.uuid4().hex[:8]}@example.com"
    user_a = _create_user(admin_client, email_a)
    user_b = _create_user(admin_client, email_b)
    endpoint_a = f"https://push.example/{uuid.uuid4()}"
    endpoint_b = f"https://push.example/{uuid.uuid4()}"

    try:
        client_a = _user_client(email_a)
        client_b = _user_client(email_b)

        inserted = (
            client_a.rpc(
                "save_push_subscription",
                {
                    "p_endpoint": endpoint_a,
                    "p_p256dh": "p256dh-a",
                    "p_auth": "auth-a",
                },
            ).execute()
        )
        assert inserted.data

        client_b.rpc(
            "save_push_subscription",
            {
                "p_endpoint": endpoint_b,
                "p_p256dh": "p256dh-b",
                "p_auth": "auth-b",
            },
        ).execute()

        seen_a = client_a.table("push_subscriptions").select("endpoint").execute().data
        endpoints_a = {row["endpoint"] for row in seen_a}
        assert endpoint_a in endpoints_a
        assert endpoint_b not in endpoints_a

        stolen = (
            client_b.table("push_subscriptions")
            .update({"auth": "nope"})
            .eq("endpoint", endpoint_a)
            .execute()
        )
        assert not stolen.data
    finally:
        admin_client.auth.admin.delete_user(user_a.id)
        admin_client.auth.admin.delete_user(user_b.id)
