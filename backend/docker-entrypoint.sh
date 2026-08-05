#!/bin/sh
set -e

uv run alembic upgrade head
uv run python -m app.seed.run

exec "$@"
