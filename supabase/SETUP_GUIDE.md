# Supabase Setup Guide

Local Supabase (Postgres + Auth + Studio) for this template.

For the full project flow, see the root [SETUP_GUIDE.md](../SETUP_GUIDE.md).

## Prerequisites

- Docker daemon running
- Python ≥ 3.13
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

## Steps

From the [`supabase/`](./) directory:

```bash
# 1. Virtualenv + seed dependencies
python -m venv .venv

# macOS / Linux
source .venv/bin/activate
# Windows
# .venv\Scripts\activate

pip install -r requirements.txt

# 2. Start stack, write .env, seed data
python setup.py
```

[`setup.py`](./setup.py) will:

1. Start local containers (`supabase start`)
2. Read credentials via `supabase status -o env`
3. Write [`.env`](./.env.example) in this folder (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`)
4. Run [`seed.py`](./seed.py)

### Useful flags

```bash
python setup.py --skip-seed   # start + write .env only
python setup.py --help
```

### SQL vs Python seeds

- **SQL** — files in [`seeds/`](./seeds/) run on `supabase db reset` (`config.toml` `[db.seed]` uses `./seeds/*.sql`).
- **Python** — [`seed.py`](./seed.py) auto-discovers `python_seeds/*.py` whose name **starts with `_`** and **contains `_seed_`**, sorted by filename. Payloads live in `python_seeds/data/_00N_data_*.py`.
  - Committed example: `_001_seed_users.py`
  - Local scratch: `_local_seed_experiments.py` (gitignored)

```bash
python seed.py
python python_seeds/_001_seed_users.py   # one script
python unseed.py --all                   # wipe app tables, then seed.py again
```

Default password is `password123` (see `python_seeds/data/_001_data_users.py`). E2E login specs use `test@example.com` / that password.

### Python tests

Tests live under [`python_tests/`](./python_tests/) (not `tests/`, so they stay distinct from SQL).

```bash
uv run pytest python_tests/unit
uv run pytest python_tests/integration   # needs local Supabase; skips if it is down
```

## What you get

| Service | Typical local URL |
| --- | --- |
| API | `http://127.0.0.1:54321` |
| MCP | `http://127.0.0.1:54321/mcp` |
| Studio | `http://127.0.0.1:54323` |
| DB | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Use the keys in `.env` when configuring [backend](../backend/SETUP_GUIDE.md) and [frontend](../frontend/SETUP_GUIDE.md). Cursor reads [`../.cursor/mcp.json`](../.cursor/mcp.json); Claude Code reads [`../.mcp.json`](../.mcp.json) at the repo root (`"type": "http"` required).

## Google login (local)

Meetly signs in through **Supabase Auth → Google**, not the frontend. Put the OAuth client on `supabase/.env` (already wired in [`config.toml`](./config.toml) as `[auth.external.google]`). On first signup, `handle_new_user()` copies the Google account name into `public.users.display_name`; later logins do not overwrite a name the user has edited.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create a **Web application** OAuth client (or add this URI to an existing one).
2. Authorized redirect URI (this is the local Auth callback, not the Vite app):

   `http://127.0.0.1:54321/auth/v1/callback`

   Optional JavaScript origins: `http://127.0.0.1:5173`, `http://127.0.0.1:5174`, `http://localhost:5173`, `http://localhost:5174`.
3. Copy the client id and secret into [`supabase/.env`](./.env.example):

   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=....apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   ```

4. Restart local Supabase so Auth interpolates those keys into `config.toml`:

   ```bash
   supabase stop && supabase start
   ```

   The CLI reads this folder's `.env` (then `.env.local`) when it resolves `env(NAME)`, so you do **not** need to source anything. Shell variables still win over the file when both set the same name.

`skip_nonce_check = true` is required for Google on local Auth. Do **not** put the Google client secret in `frontend/.env`.

## Message push notifications (Web Push)

After sign-in the web app asks once for notification permission. New DMs then notify the recipient on Android Chrome even if Meetly is closed. iPhone Chrome only receives these after **Add to Home Screen**.

Local VAPID keys live in [`.env.example`](./.env.example) (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`) and must match `VITE_VAPID_PUBLIC_KEY` in the frontend env. `python setup.py` writes the local pair into `.env` if it is missing. Edge Function secrets are wired in [`config.toml`](./config.toml) (`[edge_runtime.secrets]`).

Apply the `push_subscriptions` migration (`supabase db reset` or `supabase migration up`), then copy the public key into `frontend/.env`.

A full `supabase stop && supabase start` is required after adding or editing an Edge Function or its secrets. `supabase db reset` only recycles the database container, so the edge runtime keeps serving whatever it was started with — a function added since then returns **404**, and `[edge_runtime.secrets]` values added since then are missing. Check with:

```bash
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' supabase_edge_runtime_<project-id> \
  | grep -E 'VAPID|FUNCTIONS_CONFIG'
```

`SUPABASE_INTERNAL_FUNCTIONS_CONFIG={}` means no function is registered.

The function imports from `esm.sh` and npm on first boot, so the container needs working TLS to the internet. Behind a TLS-intercepting VPN or proxy (Cato, Zscaler, and similar) the container does not trust the injected root even when the host does, and the call fails with `503 BOOT_ERROR`. `docker logs supabase_edge_runtime_<project-id>` shows `invalid peer certificate: UnknownIssuer`. Turn the VPN off or add its root CA to the container.

Hosted project: generate a new pair (`npx web-push generate-vapid-keys`), set `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`, deploy `push-on-message`, and put the public key in the frontend env. Optional: a Database Webhook on `messages` INSERT to that function (service role JWT) covers sends that did not go through the web client.

Contribution rules: [CONTRIBUTING.md](./CONTRIBUTING.md).
