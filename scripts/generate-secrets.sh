#!/usr/bin/env bash
set -euo

echo "=== Generating SECRET_KEY ==="
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
echo "SECRET_KEY=$SECRET_KEY"

echo ""
echo "=== Generating .env file ==="
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
    echo "IMPORTANT: Edit .env with your actual database URL and API keys"
else
    echo ".env already exists, skipping"
fi

echo ""
echo "=== Setting up pre-commit hooks ==="
if command -v pre-commit &> /dev/null; then
    pre-commit install
    echo "Pre-commit hooks installed"
else
    echo "Install pre-commit with: pip install pre-commit && pre-commit install"
fi

echo ""
echo "=== Creating initial Alembic migration ==="
if [ -d backend/alembic/versions ]; then
    cd backend
    alembic revision --autogenerate -m "initial"
    alembic upgrade head
    echo "Database migrated"
else
    echo "Create alembic/versions/ directory, then run: cd backend && alembic revision --autogenerate -m 'initial' && alembic upgrade head"
fi

echo ""
echo "=== Done ==="