"""Unit tests for committed seed user payloads."""

import pytest

from python_seeds.data._001_data_users import (
    DEFAULT_PASSWORD,
    DISCOVER_OPEN_TIER_USER,
    DISCOVER_TIER_USERS,
    DISCOVER_TIERS,
    SEED_USER,
    SEED_USER_ID,
    SEED_USERS,
    TEST_USER,
    TEST_USER_ID,
    _seed_user_uuid,
    seed_user_emails,
)


def test_default_password_and_login_emails():
    assert DEFAULT_PASSWORD == "password123"
    assert seed_user_emails()[:2] == ["seed_user@gmail.com", "test@example.com"]


def test_stable_uuids():
    assert SEED_USER_ID == "00000000-0000-0000-0000-000000000001"
    assert TEST_USER_ID == "00000000-0000-0000-0000-000000000002"
    assert SEED_USER["id"] == SEED_USER_ID
    assert TEST_USER["id"] == TEST_USER_ID


def test_seed_users_list_is_the_named_dicts():
    assert SEED_USERS == [SEED_USER, TEST_USER, *DISCOVER_TIER_USERS, DISCOVER_OPEN_TIER_USER]
    for user in SEED_USERS:
        assert user["password"] == DEFAULT_PASSWORD
        assert user["profile"]["username"]
        assert user["profile"]["display_name"]


def test_discover_tier_users_cover_every_tier_with_unique_uuids():
    assert len(DISCOVER_TIER_USERS) == len(DISCOVER_TIERS)

    ids = [user["id"] for user in SEED_USERS]
    assert len(ids) == len(set(ids)), "seed user UUIDs must be unique"

    for user in DISCOVER_TIER_USERS:
        assert user["profile"]["latitude"] is not None
        assert user["profile"]["hours_since_active"] is not None

    assert DISCOVER_OPEN_TIER_USER["profile"]["hours_since_active"] > max(
        days * 24 for _, days in DISCOVER_TIERS
    )


def test_seed_user_uuid_rejects_out_of_range():
    with pytest.raises(ValueError, match="out of range"):
        _seed_user_uuid(0)
    with pytest.raises(ValueError, match="out of range"):
        _seed_user_uuid(100)
