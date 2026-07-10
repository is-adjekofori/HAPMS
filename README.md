# HAPMS — Hostel Asset and Property Management System

A web-based system for recording, signing off on, and verifying hostel room assets across academic
sessions at University of Benin student hostels. See `docs/BRD.md` and `docs/TECHNICAL_MVP.md` for
the full requirements and technical design, and `docs/TASKS.md` for the implementation task list and
progress tracker.

## Stack

- **Backend:** FastAPI (Python 3.12), SQLAlchemy, Alembic — managed with [uv](https://docs.astral.sh/uv/)
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** MySQL 8.4

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 20+ and npm
- Docker or Podman (for local MySQL)

## 1. Start the database

From the repo root:

```bash
docker compose up -d   # or: podman compose up -d
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

## Project layout

```
backend/    FastAPI app (app/core, app/models, app/schemas, app/routers, app/services, app/seed)
frontend/   Next.js app (app/, lib/, components/)
docs/       BRD.md, TECHNICAL_MVP.md, TASKS.md (source requirements + task tracker)
docker-compose.yml   Local MySQL service
```
