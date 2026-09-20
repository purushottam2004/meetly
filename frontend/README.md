# Frontend

pnpm monorepo with shared packages and Vite React apps under `apps/`.

Vercel SPA rewrites (`/(.*)` → `/index.html`) live in [`vercel.json`](./vercel.json) and [`apps/web/vercel.json`](./apps/web/vercel.json) so client-side routes do not 404 on refresh. Keep the copy that matches the Vercel Root Directory.

## Setup

Setup steps live in [SETUP_GUIDE.md](./SETUP_GUIDE.md).

For the full local stack order, see the root [SETUP_GUIDE.md](../SETUP_GUIDE.md). Contribution rules: [CONTRIBUTING.md](./CONTRIBUTING.md).
