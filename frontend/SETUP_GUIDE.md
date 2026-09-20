# Frontend Setup Guide

pnpm workspace with Vite + React apps under [`apps/`](./apps/).

For the full project flow, see the root [SETUP_GUIDE.md](../SETUP_GUIDE.md). Prefer finishing [Supabase](../supabase/SETUP_GUIDE.md) and [backend](../backend/SETUP_GUIDE.md) first.

## Prerequisites

- Node.js ≥ 22.13
- pnpm ^11.17

## Steps

From the [`frontend/`](./) directory:

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Environment (shared by all apps)
cp .env.example .env
# or start from the local template:
# cp .env.local.example .env.local
```

Vite loads shared env from this folder first, then `apps/<app>/.env*` (app values win on conflict). See [`apps/web/vite.config.ts`](./apps/web/vite.config.ts).

### Fill env vars

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | From [`supabase/.env`](../supabase/.env.example) → `SUPABASE_URL` (local default `http://127.0.0.1:54321`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | From supabase `.env` → `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_BACKEND_URL` | Backend URL, e.g. `http://127.0.0.1:8080` |
| `VITE_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY` in [`supabase/.env`](../supabase/.env.example). Needed for message push notifications. |

Never put `SUPABASE_SECRET_KEY` or `VAPID_PRIVATE_KEY` in frontend env files.

Google **login** credentials go in [`supabase/.env`](../supabase/.env.example), not here. See [supabase/SETUP_GUIDE.md — Google login (local)](../supabase/SETUP_GUIDE.md#google-login-local).

Optional app-specific overrides: [`apps/web/.env.example`](./apps/web/.env.example), [`apps/web2/.env.example`](./apps/web2/.env.example).

### Run

```bash
pnpm dev                          # all apps in parallel
pnpm --filter web run dev         # web only
pnpm --filter web2 run dev        # web2 only
```

Vite typically serves apps on ports **5173** / **5174**.

On Vercel, keep a `vercel.json` with a rewrite of `/(.*)` → `/index.html` in the project Root Directory. Copies live at [`vercel.json`](./vercel.json), [`apps/web/vercel.json`](./apps/web/vercel.json), and [`apps/web2/vercel.json`](./apps/web2/vercel.json). Use the app copy when Root Directory is `frontend/apps/web` or `frontend/apps/web2`, and the frontend copy when Root Directory is `frontend`. Without it, client-side routes 404 on refresh.

Browser flows that need backend + DB belong in **[../e2e/](../e2e/README.md)**. Playwright will build + preview these apps (or reuse `pnpm dev` if it is already up). Contribution rules: [CONTRIBUTING.md](./CONTRIBUTING.md).

### Other scripts

```bash
pnpm build
pnpm lint
```
