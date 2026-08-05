# HAPMS — Hostel Asset and Property Management System

A web-based system for recording, signing off on, and verifying hostel room assets across academic
sessions at University of Benin student hostels. See `docs/BRD.md` and `docs/TECHNICAL_MVP.md` for
the full requirements and technical design, and `docs/TASKS.md` for the implementation task list and
progress tracker.

## Architecture overview

Three roles (Administrator, Porter, Student) share one FastAPI backend and one Next.js frontend, with
role-based access enforced on every request (`app/core/deps.py`'s `require_role(...)`, checked against
a JWT issued at login). The "core loop" every session goes through is: Admin configures halls/rooms/
sessions → Porter records a room's asset baseline → Student views it and signs off (or disputes) →
Porter re-verifies at session end, and the system auto-flags any discrepancy against the original
baseline → Admin reports on and audits the whole session. See `docs/TECHNICAL_MVP.md §4` for the full
component/data-flow diagram and `docs/TASKS.md` for how each phase built on the last.

## Stack

- **Backend:** FastAPI (Python 3.12), SQLAlchemy, Alembic — managed with [uv](https://docs.astral.sh/uv/)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** MySQL 8.4

## Quickstart: everything in one command

```bash
docker compose up -d --build   # or: podman compose up -d --build
```

This builds and starts all three services — MySQL, the backend (running migrations and the
structural seed automatically on boot), and the frontend — from the defaults in `.env.example`.
Once it's up: frontend at `http://localhost:3000`, API at `http://localhost:8000` (health check at
`/health`). You still need to create your first Admin account directly against the database (see
"Migrations and seed data in production" below) — there's no self-registration for any role.

Everything below this point is the equivalent **manual, per-service setup** — useful for active
development (hot reload, debugging, running tests), where the one-command path above isn't as
convenient. Skip to "Seed data" if you used the one-command path.

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 20+ and npm
- Docker or Podman (for local MySQL)

## 1. Start the database

From the repo root:

```bash
docker compose up -d mysql   # or: podman compose up -d mysql
```

This starts MySQL 8.4 on `localhost:3306` with the credentials in `.env.example` (copy to `.env` at
the repo root to override).

> **Rootless Podman:** if `podman compose` can't reach the Podman API socket, enable it once with
> `systemctl --user enable --now podman.socket`.

## 2. Run the backend

```bash
cd backend
cp .env.example .env   # defaults already match the docker-compose MySQL service
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

The API is served at `http://localhost:8000`; check `http://localhost:8000/health`.

Lint/format:

```bash
uv run ruff check .
uv run ruff format .
```

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The app is served at `http://localhost:3000`.

Lint/format:

```bash
npm run lint
npm run format        # write
npm run format:check  # check only
```

## 4. Seed data

```bash
cd backend
uv run python -m app.seed.run        # structural reference data (asset_types, hall_asset_rules) — always run this first
uv run python -m app.seed.run_demo   # optional: a full demo/UAT scenario (halls, rooms, accounts, an active session,
                                      # a clean baseline, a disputed one, a flagged one, an unrecorded one)
```

Both are idempotent — safe to re-run. `run_demo` prints the demo accounts' emails and shared password
(`DemoPass123!`) once it finishes; it's a no-op if the demo data already exists.

## 5. Run the backend test suite

```bash
cd backend
uv run pytest
```

These run against the real dev database configured in `.env` (no mocking), the same convention used
for manual verification throughout `docs/TASKS.md`. Each test creates its own uniquely-named rows and
cleans them up itself, so the suite is safe to re-run without touching the database in between.

## Project layout

```
backend/    FastAPI app (app/core, app/models, app/schemas, app/routers, app/services, app/seed)
            backend/tests/  pytest suite (unit + integration against the real dev DB)
            backend/Dockerfile, docker-entrypoint.sh  container image (migrate + seed + serve)
frontend/   Next.js app (app/, lib/, components/)
            frontend/Dockerfile  standalone-output container image
docs/       BRD.md, TECHNICAL_MVP.md, TASKS.md (source requirements + task tracker)
docker-compose.yml   Full local stack: MySQL, backend, frontend
```

## Deployment

The app is built to be host-agnostic: everything environment-specific is read from env vars, nothing
is hardcoded to `localhost`. Deploying anywhere that can run a Python ASGI app, a Node server (or
static export), and a MySQL 8.4-compatible database comes down to setting these correctly.
`backend/Dockerfile` and `frontend/Dockerfile` (used by the root `docker-compose.yml`) are a working
starting point for a container-based deployment, but are dev/demo images, not production-hardened —
in particular, the backend image re-runs migrations and the structural seed on every container start,
which is convenient locally but not something you'd want unconditionally in production.

### Environment variables

**Backend** (`backend/.env` — see `backend/.env.example`):

| Variable | Production guidance |
| --- | --- |
| `ENVIRONMENT` | Set to `production`. |
| `DATABASE_URL` | Point at the production MySQL instance. Use a dedicated app user (not `root`) scoped to the `hapms` schema. |
| `JWT_SECRET_KEY` | **Generate a fresh value per environment** — never reuse the committed dev placeholder. `python -c "import secrets; print(secrets.token_hex(32))"`. Treat it as a secret (host-provided secret manager / env var injection, not committed to git). |
| `JWT_EXPIRY_MINUTES` | Keep as-is (480 min) unless there's a specific reason to shorten it. |
| `CORS_ORIGINS` | Set to the deployed frontend's exact origin(s), e.g. `["https://hapms.example.edu"]`. Never use `["*"]` alongside `allow_credentials=True` (the app sends Bearer tokens, not cookies, but a wildcard still defeats the point of the allow-list). |

**Frontend** (`frontend/.env.local` — see `frontend/.env.example`):

| Variable | Production guidance |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | The deployed backend's public URL plus `/api`, e.g. `https://api.hapms.example.edu/api`. This is baked in at build time (`NEXT_PUBLIC_*` vars are exposed to the browser bundle), so it must be set before `npm run build`, not just at runtime. |

**Root** (`.env` — see `.env.example`): only used by `docker-compose.yml` for local MySQL provisioning;
a managed/production database doesn't need this file at all.

### Secrets management

- Never commit real secrets. `backend/.env.example` and `frontend/.env.example` only ever contain
  placeholder/dev values — copy them to `.env` / `.env.local` locally, and inject real values via
  your host's secret manager or CI/CD environment configuration in production.
  `MYSQL_ROOT_PASSWORD`/`MYSQL_PASSWORD` (root `.env.example`) are dev-only Docker Compose credentials
  and must not be reused for a production database.
- Rotate `JWT_SECRET_KEY` if it's ever exposed; every previously-issued token becomes invalid
  immediately (tokens are stateless JWTs — there's no server-side session store to also clear).

### Migrations and seed data in production

```bash
cd backend
uv run alembic upgrade head          # run once against the production database
uv run python -m app.seed.run        # structural reference data — required, not optional
uv run python -m app.seed.run_demo   # optional: skip this in production; it creates demo/UAT
                                      # accounts with a shared, publicly-documented password
```

Create the real first Administrator account directly against the production database (there is no
public self-registration for any role, by design — see `docs/BRD.md §5.1`), e.g.:

```bash
uv run python -c "
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
db = SessionLocal()
db.add(User(full_name='<name>', email='<email>', password_hash=hash_password('<temporary password>'), role=UserRole.ADMIN))
db.commit()
"
```
