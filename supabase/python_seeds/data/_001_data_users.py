"""Auth users created by _001_seed_users.py.

Emails, password, and profile fields live here. Other seed modules should
import these dicts instead of repeating credentials.
"""

DEFAULT_PASSWORD = "password123"


def _seed_user_uuid(n: int) -> str:
    if not 1 <= n <= 99:
        raise ValueError(f"seed user uuid out of range: {n}")
    return f"00000000-0000-0000-0000-{n:012d}"


SEED_USER_ID = _seed_user_uuid(1)
TEST_USER_ID = _seed_user_uuid(2)

# public.discover_profiles() walks these (radius_km, max_days) tiers, in this
# order, stopping at the first tier with someone the viewer has not swiped.
# Chosen/rejected people are still returned. Keep in sync with the latest
# discover_profiles() migration.
DISCOVER_TIERS = [
    (0.5, 1),
    (1.0, 1),
    (3.0, 1),
    (0.5, 2),
    (1.0, 2),
    (3.0, 2),
    (5.0, 2),
    (10.0, 2),
    (15.0, 2),
    (15.0, 4),
    (50.0, 7),
]

# ~1 degree of latitude is ~111km near the equator; close enough for seed data.
KM_PER_DEGREE_LAT = 111.0


def _auth_user(
    *,
    email: str,
    name: str,
    user_id: str,
    username: str,
    age: int,
    headline: str,
    location_text: str,
    latitude: float,
    longitude: float,
    hours_since_active: float = 0,
    is_active: bool = True,
    open_to_chat: bool = False,
) -> dict:
    return {
        "id": user_id,
        "email": email,
        "password": DEFAULT_PASSWORD,
        "user_metadata": {"name": name},
        "profile": {
            "username": username,
            "display_name": name,
            "age": age,
            "headline": headline,
            "location_text": location_text,
            "latitude": latitude,
            "longitude": longitude,
            "hours_since_active": hours_since_active,
            # The "Activate Profile" toggle defaults to off for real signups;
            # seed users are active so Discover has something to show out of
            # the box.
            "is_active": is_active,
            "open_to_chat": open_to_chat,
        },
    }


SEED_USER = _auth_user(
    email="seed_user@gmail.com",
    name="Seed User",
    user_id=SEED_USER_ID,
    username="seed_user",
    age=27,
    headline="Product Designer @ Figma",
    location_text="Koramangala, Bengaluru",
    latitude=12.9352,
    longitude=77.6245,
    hours_since_active=0,
)

TEST_USER = _auth_user(
    email="test@example.com",
    name="Test User",
    user_id=TEST_USER_ID,
    username="test_user",
    age=29,
    headline="Backend Eng, open to freelance",
    location_text="Indiranagar, Bengaluru",
    latitude=12.9784,
    longitude=77.6408,
    hours_since_active=0,
    open_to_chat=True,
)

# Discover-feed tier coverage, all offset north from SEED_USER's location
# (Koramangala) so `discover_profiles(SEED_USER_ID)` can walk every tier by
# swiping through them one at a time. Distances are approximate (latitude
# offset only), which is fine for exercising the radius/recency bands.
_ORIGIN_LAT = SEED_USER["profile"]["latitude"]
_ORIGIN_LNG = SEED_USER["profile"]["longitude"]


def _offset_lat(km: float) -> float:
    return _ORIGIN_LAT + km / KM_PER_DEGREE_LAT


# (distance_km placed at, hours_since_active) per discovery tier, plus one
# profile far beyond every tier for the final "open" fallback.
_DISCOVER_TIER_FIXTURES = [
    (0.3, 2),  # tier 1: 0.5km / 1 day
    (0.8, 2),  # tier 2: 1km / 1 day
    (2.5, 2),  # tier 3: 3km / 1 day
    (0.3, 30),  # tier 4: 0.5km / 2 days
    (0.8, 30),  # tier 5: 1km / 2 days
    (2.5, 30),  # tier 6: 3km / 2 days
    (4.0, 30),  # tier 7: 5km / 2 days
    (8.0, 30),  # tier 8: 10km / 2 days
    (12.0, 30),  # tier 9: 15km / 2 days
    (12.0, 72),  # tier 10: 15km / 4 days
    (30.0, 120),  # tier 11: 50km / 7 days
]

DISCOVER_TIER_USERS = [
    _auth_user(
        email=f"discover_tier{i}@example.com",
        name=f"Tier {i} Nearby",
        user_id=_seed_user_uuid(2 + i),
        username=f"discover_tier{i}",
        age=25 + i,
        headline=(
            f"Seed profile — ~{distance_km}km from Seed User, "
            f"active {hours}h ago (tier {i}: {radius_km}km / {max_days}d)"
        ),
        location_text=f"{distance_km}km north of Koramangala, Bengaluru",
        latitude=_offset_lat(distance_km),
        longitude=_ORIGIN_LNG,
        hours_since_active=hours,
    )
    for i, ((distance_km, hours), (radius_km, max_days)) in enumerate(
        zip(_DISCOVER_TIER_FIXTURES, DISCOVER_TIERS), start=1
    )
]

# Beyond every finite tier (50km / 7 days) — only ever surfaces via the
# final, unbounded "open" fallback in discover_profiles().
DISCOVER_OPEN_TIER_USER = _auth_user(
    email="discover_open@example.com",
    name="Open Tier",
    user_id=_seed_user_uuid(2 + len(DISCOVER_TIERS) + 1),
    username="discover_open",
    age=31,
    headline="Seed profile — far away and inactive; only shows in the open fallback",
    location_text="Connaught Place, Delhi",
    latitude=28.6315,
    longitude=77.2167,
    hours_since_active=240,
)

SEED_USERS = [
    SEED_USER,
    TEST_USER,
    *DISCOVER_TIER_USERS,
    DISCOVER_OPEN_TIER_USER,
]


def seed_user_emails() -> list[str]:
    return [user["email"] for user in SEED_USERS]
