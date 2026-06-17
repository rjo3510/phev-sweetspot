#!/usr/bin/env bash
# Trigger a deploy on the server: pull the latest image from GHCR and restart.
# Run this from a machine that can SSH to the server (the dev VM cannot reach it).
#
#   PHEV_SERVER=user@phev-host ./ship.sh
#   ./ship.sh user@phev-host                # or pass the target as an argument
#
# The server must already be set up once (see DEPLOY.md): docker login ghcr.io,
# the project folder present with a filled-in .env next to docker-compose.yml.
set -euo pipefail

SERVER="${1:-${PHEV_SERVER:?Set PHEV_SERVER=user@host or pass it as the first argument}}"
REMOTE_DIR="${PHEV_REMOTE_DIR:-phev-sweetspot}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "Deploying tag '${IMAGE_TAG}' to ${SERVER}:${REMOTE_DIR} ..."
ssh "$SERVER" "cd '$REMOTE_DIR' \
  && IMAGE_TAG='$IMAGE_TAG' docker compose pull \
  && IMAGE_TAG='$IMAGE_TAG' docker compose up -d \
  && docker image prune -f"
echo "Done."
