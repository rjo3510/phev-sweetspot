#!/usr/bin/env bash
# OFFLINE FALLBACK ONLY. The normal flow pulls the prebuilt image from GHCR
# (see DEPLOY.md) and needs no tarball. Use this when the host cannot
# reach GHCR: it bundles the source so the image can be built on the host.
set -euo pipefail
cd "$(dirname "$0")"

OUT="phev-sweetspot-deploy.tar.gz"
tar czf "$OUT" \
  --exclude='.git' \
  --exclude='.venv' \
  --exclude='*.db' \
  --exclude='__pycache__' \
  --exclude='.pytest_cache' \
  --exclude='*.tar.gz' \
  app uvicorn_log_config.json requirements.txt Dockerfile .dockerignore \
  docker-compose.yml docker-compose.build.yml .env.example

echo "Created $(pwd)/$OUT"
echo
echo "On the server:"
echo "  mkdir phev-sweetspot && tar xzf $OUT -C phev-sweetspot"
echo "  cd phev-sweetspot"
echo "  cp .env.example .env   # fill in OWNER_PASSWORD_HASH, SWEETSPOT_SECRET, PROXY_NETWORK"
echo "  docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build"
