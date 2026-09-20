# GitHub Actions Setup

Predefined workflows for this template. Local stack setup is in the root [SETUP_GUIDE.md](../../SETUP_GUIDE.md).

Workflows are committed as `*.yaml.disabled` so a fresh fork does not run CI until you opt in.

## Enable a workflow

GitHub only runs files named `*.yml` or `*.yaml` under `.github/workflows/`.

```bash
# from the repo root
git mv .github/workflows/<name>.yaml.disabled .github/workflows/<name>.yaml
```

Commit and push. After that, the workflow runs on the events listed in its `on:` block, or from the Actions tab via **Run workflow** (`workflow_dispatch`).

Disable again by renaming back to `*.yaml.disabled`.

## Versions

CI is pinned to the same minimums as the root setup guide:

| Tool | CI pin | Repo requirement |
| --- | --- | --- |
| Python | `3.13` | ≥ 3.13 |
| Node.js | `22` | ≥ 22.13 |
| pnpm | `11.17.0` | ^11.17 |

## Workflows

### `frontend-lint.yaml` — Frontend Lint

Runs `pnpm lint` in `frontend/`.

| | |
| --- | --- |
| Triggers | Push/PR touching `frontend/**` on `main` or `stage`; manual dispatch |
| Secrets | None |


### `frontend-build.yaml` — Frontend Build

Runs `pnpm build` in `frontend/`. Copies `frontend/.env.example` to `.env`, then injects placeholder Vite env so the build can resolve `import.meta.env` without real credentials:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BACKEND_URL`

`VITE_VAPID_PUBLIC_KEY` comes from `.env.example` when present.

| | |
| --- | --- |
| Triggers | Push/PR touching `frontend/**` on `main` or `stage`; manual dispatch |
| Secrets | None |


### `pylint.yaml` — Backend Lint

Runs `pylint .` in `backend/` after `pip install -r requirements-dev.txt` (includes `pylint`).

| | |
| --- | --- |
| Triggers | Push/PR touching `backend/**` on `main` or `stage`; manual dispatch |
| Secrets | None |


### `pytest-unit.yaml` — Backend Unit Tests

Runs `pytest tests/unit/` in `backend/`.

| | |
| --- | --- |
| Triggers | Push/PR touching `backend/**` on `main` or `stage`; manual dispatch |
| Secrets | None |


### `pytest-integration.yaml` — Backend Integration Tests

Starts local Supabase, reads `PUBLISHABLE_KEY` and `SECRET_KEY` from `supabase status`, then runs `pytest tests/integration/` with:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

The runner needs Docker (GitHub-hosted `ubuntu-latest` already has it).

| | |
| --- | --- |
| Triggers | Push/PR touching `backend/**` or `supabase/**` on `main` or `stage`; manual dispatch |
| Secrets | None |


### `e2e.yaml` — Playwright E2E

Starts local Supabase, seeds users, starts the backend, then runs Playwright from `e2e/`. Playwright builds + previews `web` (`5173`). Uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_BACKEND_URL`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

The runner needs Docker (GitHub-hosted `ubuntu-latest` already has it). Local usage: [e2e/README.md](../../e2e/README.md).

| | |
| --- | --- |
| Triggers | Push/PR touching `e2e/**`, `frontend/**`, `backend/**`, or `supabase/**` on `main` or `stage`; manual dispatch |
| Secrets | None |


### `db-push.yaml` — Deploy Migrations

Links the Supabase CLI to a hosted project and runs `supabase db push`. The GitHub Environment is chosen from the branch:

| Branch | GitHub Environment |
| --- | --- |
| `main` | `Production` |
| `staging` | `Preview` |

Use the same secret and variable **names** in both environments; GitHub injects that environment’s values into the job.

| Name | Type | Where to get it |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Secret (repo or each environment) | [Supabase access tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Secret (each environment) | Project Settings → Database → Database password |
| `SUPABASE_PROJECT_ID` | Variable (each environment) | Project Settings → General → Reference ID |

`SUPABASE_ACCESS_TOKEN` is an account token, so it can live once at **repository** secret scope. Put `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_ID` on **Production** (prod project) and **Preview** (staging project).

This workflow does **not** use `SUPABASE_SECRET_KEY` or `SUPABASE_PUBLISHABLE_KEY`. Those are app keys; keep them for frontend/backend deploys.

| | |
| --- | --- |
| Triggers | Push to `main` or `staging` touching `supabase/**` (or this workflow file); manual dispatch |
| Secrets / vars | The three above, resolved from the selected environment |

The job will fail until each environment has `SUPABASE_PROJECT_ID` and `SUPABASE_DB_PASSWORD`, and an access token is available.
