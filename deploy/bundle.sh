#!/usr/bin/env bash
# Create a clean tarball of the project to move to the Docker host.
# The Docker image is built ON the host, so the tarball must contain the source.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="phev-sweetspot-deploy.tar.gz"
tar czf "$OUT" \
  --exclude='.git' \
  --exclude='.venv' \
  --exclude='*.db' \
  --exclude='__pycache__' \
  --exclude='.pytest_cache' \
  --exclude='*.tar.gz' \
  app uvicorn_log_config.json requirements.txt Dockerfile .dockerignore deploy

echo "Created $(pwd)/$OUT"
echo
echo "On the server:"
echo "  mkdir phev-sweetspot && tar xzf $OUT -C phev-sweetspot"
echo "  cd phev-sweetspot/deploy"
echo "  cp .env.example .env   # fill in OWNER_PASSWORD_HASH, SWEETSPOT_SECRET, PROXY_NETWORK"
echo "  docker compose up -d --build"
