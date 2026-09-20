# Local Development Setup

End-to-end guide for running this template locally. Follow the steps in order.

## Prerequisites

Install these before starting:


| Tool                                                                                   | Notes                      |
| -------------------------------------------------------------------------------------- | -------------------------- |
| [Python](https://www.python.org/downloads/)                                            | ≥ 3.13                     |
| [Docker](https://docs.docker.com/get-docker/)                                          | Daemon must be running     |
| [Node.js](https://nodejs.org/)                                                         | ≥ 22.13 (for the frontend) |
| [pnpm](https://pnpm.io/installation)                                                   | ^11.17                     |
| [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) | Latest Version             |


## Setup order

1. **Database** — [supabase/SETUP_GUIDE.md](./supabase/SETUP_GUIDE.md)
2. **Backend** — [backend/SETUP_GUIDE.md](./backend/SETUP_GUIDE.md)
3. **Frontend** — [frontend/SETUP_GUIDE.md](./frontend/SETUP_GUIDE.md)
4. **E2E** (optional) — [e2e/README.md](./e2e/README.md)

After Supabase is up, copy values from [`supabase/.env`](./supabase/.env) (created by `setup.py`) into the backend and frontend env files. See each package guide for the exact variable names.

Google login on local: add the OAuth client to `supabase/.env`, source that file, then restart Supabase. Authorized redirect URI is `http://127.0.0.1:54321/auth/v1/callback`. Details: [supabase/SETUP_GUIDE.md — Google login (local)](./supabase/SETUP_GUIDE.md#google-login-local).

Message notifications: copy `VITE_VAPID_PUBLIC_KEY` from [`frontend/.env.example`](./frontend/.env.example) into `frontend/.env` so it matches `VAPID_PUBLIC_KEY` in `supabase/.env`. See [supabase/SETUP_GUIDE.md — Message push notifications](./supabase/SETUP_GUIDE.md#message-push-notifications-web-push).

Local Supabase also exposes MCP at [http://127.0.0.1:54321/mcp](http://127.0.0.1:54321/mcp). Cursor reads [`.cursor/mcp.json`](./.cursor/mcp.json); Claude Code reads [`.mcp.json`](./.mcp.json) at the repo root. See [CONTRIBUTING.md — Agent guidance](./CONTRIBUTING.md#agent-guidance).

## Verify: login → Hello

Once all three services are running:

1. Open the web app (typically [http://127.0.0.1:5173](http://127.0.0.1:5173)).
2. Sign in with a seeded user:

   | Email | Password |
   | --- | --- |
   | `seed_user@gmail.com` | `password123` |
   | `test@example.com` | `password123` |

3. On the home page, click **Hello**.
4. You should see a JSON response like:

   ```json
   {
     "message": "hello",
     "authenticated": true,
     "user": { "id": "...", "email": "seed_user@gmail.com" }
   }
   ```

If Hello fails with a CORS or network error, confirm the backend is on [http://127.0.0.1:8080](http://127.0.0.1:8080), `DEPLOYMENT_ENV=LOCAL` in `backend/.env`, and `VITE_BACKEND_URL=http://127.0.0.1:8080` in `frontend/.env`.

To run the same path in a browser automatically: [e2e/README.md](./e2e/README.md) (`cd e2e && npm test`).

## GitHub Actions

This repo ships predefined GitHub Actions workflows for frontend lint/build, backend lint/tests, Playwright e2e, and Supabase migrations. They live in [`.github/workflows/`](./.github/workflows/) as `*.yaml.disabled` until you enable them.

What each workflow does, the versions it pins (Python ≥ 3.13, Node ≥ 22.13, pnpm ^11.17), and how to turn it on are in [`.github/workflows/SETUP.md`](./.github/workflows/SETUP.md).

## Package guides

- [Supabase setup](./supabase/SETUP_GUIDE.md)
- [Backend setup](./backend/SETUP_GUIDE.md)
- [Frontend setup](./frontend/SETUP_GUIDE.md)
- [E2E tests](./e2e/README.md)
- [Contributing](./CONTRIBUTING.md)
- [Agent instructions](./AGENTS.md) (Cursor + Claude Code: [CONTRIBUTING.md — Agent guidance](./CONTRIBUTING.md#agent-guidance))
- [GitHub Actions setup](./.github/workflows/SETUP.md)
