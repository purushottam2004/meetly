# Contributing (monorepo)

Thanks for contributing. This file is the **repo-wide** workflow. Language- and package-specific rules live next to the code.

## Package guides

| Area | Contributing guide |
| --- | --- |
| Backend (Python / FastAPI) | [backend/CONTRIBUTING.md](./backend/CONTRIBUTING.md) |
| Frontend (TypeScript / React) | [frontend/CONTRIBUTING.md](./frontend/CONTRIBUTING.md) |
| Database (Supabase) | [supabase/CONTRIBUTING.md](./supabase/CONTRIBUTING.md) |

## Python virtualenvs

Never use system / raw `python` (or `python3`) for this repo. Each Python package has its own venv — activate that one before running anything.

| Work | Venv | Activate |
| --- | --- | --- |
| Anything **supabase** related (seeds, `seed.py`, `unseed.py`, seed scripts, `python_tests/`) | `supabase/.venv` | `cd supabase && source .venv/bin/activate` (or `uv run` from `supabase/`) |
| Anything **backend** related (API, pytest, pylint, uvicorn) | `backend/.venv` | `cd backend && source .venv/bin/activate` |

Do not mix them: do not run seeds with `backend/.venv`, and do not run the API or backend tests with `supabase/.venv`. If the venv is missing, create it from that package’s [SETUP_GUIDE.md](./SETUP_GUIDE.md) (`python -m venv .venv` is only for creating the venv, then use `.venv/bin/python` / activate from then on).

## Branches

Work from an up-to-date `stage` (or the branch your team designates), never commit directly to `main` / `stage` unless you own releases.

| Prefix | Use |
| --- | --- |
| `feature/<short-name>` | New behaviour |
| `bugs/<short-name>` | Bug fixes |
| `chore/<short-name>` | Tooling, docs, CI |

Examples: `feature/login-e2e`, `bugs/fix-hello-cors`, `chore/setup-docs`.

## Git

When renaming or moving a tracked file, always use `git mv`. Never use plain `mv` (or a filesystem rename) in this monorepo — Git then treats the change as a delete plus an add and you lose the rename.

### Commit messages

Structure the commit message so **each change in that commit** gets its own line:

```
changed : one-liner description
changed : one-liner description
```

Example:

```
changed : auto-discover python_seeds/_…_seed_….py scripts and add unseed.py
changed : add python_tests/ unit coverage and seed/unseed smoke
```

You may add notes, context, or a longer body after this block if needed, but the **one line per change** list is the important part and should always be present.

### Before committing (mandatory)

**Do not commit until you have run the tests / checks for every package your change touches.** Type-check alone, “it seeded”, or “it compiles” is not enough when that package has a defined test / quality bar below.

| Touched | Must run before commit |
| --- | --- |
| `backend/` | `pylint .`, `pytest tests/unit` (+ `tests/integration` when DB-related) — from `backend/.venv` |
| `frontend/` | `pnpm lint` |
| `supabase/` | Apply / validate migrations as needed; `pytest python_tests/unit` from `supabase/.venv` or `uv run`; smoke `seed.py` when seeds change; keep IDs in sync with backend/e2e |
| `e2e/` or behaviour covered by Playwright | Relevant `npm run test:…` project(s) |

If a check fails, **fix it and create a new commit** only after green (or update the PR description with an explicit waiver only when the team agrees). Skipping these because the change “looks fine” is not allowed.

Full commands: [Quality bar (by area)](#quality-bar-by-area).

## Pull requests

1. Keep PRs focused (one concern per PR when practical).
2. Describe **why** and how to test (checklist welcome).
3. Ensure package checks pass (see below) before requesting review — same bar as **Before committing**.
4. Do not commit secrets (`.env`, service keys, etc.).

## Improve the docs as you go

While contributing, if you notice anything that would have made the work easier or faster — missing steps, better logging, outdated commands, unclear SETUP/CONTRIBUTING/README sections, a missing or outdated agent skill, or useful tips that only lived in someone's head — **report it**.

- Prefer a short note in the PR description (or a follow-up docs PR / issue).
- Point at the file that should change when you can (`SETUP_GUIDE.md`, package guides, e2e README, `.cursor/skills/`, `.claude/skills/`, etc.).
- Small doc fixes in the same PR are welcome when they are clearly related; larger doc rewrites can be a separate `chore/` PR.

Good docs compound: leave the next person (including future you) better off than you found them.

## Agent guidance

Always-on agent instructions: **[AGENTS.md](./AGENTS.md)** (read the README hub before changing code or committing). Tools that look under `.agents/` use **[.agents/AGENTS.md](./.agents/AGENTS.md)**.

This template supports **Cursor** and **Claude Code**. If you change a skill, update **both** copies so users templating with either tool stay in sync.

| Tool | Instructions | Skills | Project MCP |
| --- | --- | --- | --- |
| Cursor | [AGENTS.md](./AGENTS.md) | [`.cursor/skills/`](./.cursor/skills/) | [`.cursor/mcp.json`](./.cursor/mcp.json) |
| Claude Code | [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) (imports `AGENTS.md`) | [`.claude/skills/`](./.claude/skills/) | [`.mcp.json`](./.mcp.json) |

Claude Code does **not** read `.cursor/mcp.json`. Project MCP belongs in `.mcp.json` at the repo root, as strict JSON (no `//` comments) with `"type": "http"` on URL servers. After `supabase start`, approve `supabase-local` (`http://127.0.0.1:54321/mcp`) in the first interactive session. To use a remote project, add a personal HTTP server (do not commit the project ref):

```json
{
  "mcpServers": {
    "supabase-production": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=<your-remote-project-ref>&read_only=true"
    }
  }
}
```

Current skills (same names in both skill trees):

- [`create-video-for-workflow`](./.claude/skills/create-video-for-workflow/SKILL.md) — when asked for a video of a workflow, write a temporary e2e test, run it with `E2E_VIDEO=1` and `E2E_IMAGES=1`, point at `e2e/videos/<timestamp>/` (older runs are kept) and `images/`, and keep recorder specs in gitignored `video_test/` folders. Cursor copy: [`.cursor/skills/create-video-for-workflow/SKILL.md`](./.cursor/skills/create-video-for-workflow/SKILL.md).
- [`development-full-stack-web-template`](./.claude/skills/development-full-stack-web-template/SKILL.md) — same standing workflow as [AGENTS.md](./AGENTS.md). Cursor copy: [`.cursor/skills/development-full-stack-web-template/SKILL.md`](./.cursor/skills/development-full-stack-web-template/SKILL.md).

## Quality bar (by area)

Run the checks for the packages you touched:

**Backend**

```bash
cd backend
source .venv/bin/activate
pylint .
pytest tests/unit   # + tests/integration when DB-related
```

Details: [backend/CONTRIBUTING.md](./backend/CONTRIBUTING.md).

**Frontend**

```bash
cd frontend
pnpm lint
```

Details: [frontend/CONTRIBUTING.md](./frontend/CONTRIBUTING.md).

**Database**

- Prefer new migrations over editing applied history.
- Keep Python seed IDs / emails in sync with backend and e2e expectations.
- Run Python seeds from `supabase/.venv` (`cd supabase && source .venv/bin/activate`) or `uv run`, never raw `python`.

```bash
cd supabase
source .venv/bin/activate
pytest python_tests/unit
# pytest python_tests/integration   # needs local Supabase
```

Details: [supabase/CONTRIBUTING.md](./supabase/CONTRIBUTING.md).

**E2E**

```bash
cd e2e
npm test                 # or npm run test:web
```

Details: [e2e/README.md](./e2e/README.md).

## Security

- Never expose `SUPABASE_SECRET_KEY` (or equivalent) to the browser.
- Do not bypass auth on `/api/v1/*` routes.
- Ask before changing auth or shared seed UUIDs used by tests.

## Setup

Local environment: **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**.
