# Full Stack Web Template

This repo is a template with:

- **Backend** — FastAPI (Python)
- **Frontend** — React + TypeScript (Vite, pnpm workspace)
- **Database** — Supabase (managed Postgres + Auth)
- **E2E** — Playwright (`web`)

## Docs

| Doc | Purpose |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | Shared instructions for AI agents (Cursor, Claude Code, and others) |
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | Get a local stack running (DB → API → apps → e2e) |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Branches, PRs, and quality bar |

## AI agents (Cursor and Claude Code)

This template ships agent config for both [Cursor](https://cursor.com) and [Claude Code](https://code.claude.com). Shared workflow rules live in **[AGENTS.md](./AGENTS.md)**; keep tool-specific copies in sync when you change a skill.

| Tool | Instructions | Skills | MCP |
| --- | --- | --- | --- |
| Any / shared | [AGENTS.md](./AGENTS.md) (also [`.agents/AGENTS.md`](./.agents/AGENTS.md)) | — | — |
| Cursor | [AGENTS.md](./AGENTS.md) | [`.cursor/skills/`](./.cursor/skills/) | [`.cursor/mcp.json`](./.cursor/mcp.json) |
| Claude Code | [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) (imports `AGENTS.md`) | [`.claude/skills/`](./.claude/skills/) | [`.mcp.json`](./.mcp.json) (repo root) |

Claude Code reads **`.mcp.json`** at the repo root, not `.cursor/mcp.json`. URL servers need `"type": "http"`. After local Supabase is up, approve `supabase-local` (`http://127.0.0.1:54321/mcp`) in the first interactive Claude Code session. A remote Supabase MCP stays in your personal config — see [CONTRIBUTING.md](./CONTRIBUTING.md#agent-guidance).

Package-level docs:

| Package | README | Setup | Contributing |
| --- | --- | --- | --- |
| [backend/](./backend/) | [README](./backend/README.md) | [SETUP](./backend/SETUP_GUIDE.md) | [CONTRIBUTING](./backend/CONTRIBUTING.md) |
| [frontend/](./frontend/) | [README](./frontend/README.md) | [SETUP](./frontend/SETUP_GUIDE.md) | [CONTRIBUTING](./frontend/CONTRIBUTING.md) |
| [supabase/](./supabase/) | — | [SETUP](./supabase/SETUP_GUIDE.md) | [CONTRIBUTING](./supabase/CONTRIBUTING.md) |
| [e2e/](./e2e/) | [README](./e2e/README.md) | — | — |

## Quick start

1. Follow **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** (starts with `supabase`, then backend, then frontend).
2. Read **[CONTRIBUTING.md](./CONTRIBUTING.md)** before opening a PR.
3. Use the package README for day-to-day commands in that area.
