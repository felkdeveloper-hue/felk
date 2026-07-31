#!/usr/bin/env bash
# Deploy / restart the FE Platform API on EC2.
# Used by GitHub Actions (.github/workflows/deploy-ec2.yml) and safe to run manually:
#   bash scripts/deploy-ec2.sh
set -euo pipefail

APP_DIR="${EC2_APP_DIR:-${HOME}/felk}"
BRANCH="${EC2_BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/api/v1/health/ready}"

echo "==> Deploying FE API in ${APP_DIR} (branch ${BRANCH})"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "ERROR: ${APP_DIR} is not a git repo. Clone the repo there first."
  exit 1
fi

cd "${APP_DIR}"

echo "==> Fetching latest code"
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

echo "==> Installing dependencies"
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
else
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
  pnpm install --frozen-lockfile
fi

echo "==> Building API"
pnpm --filter @fe-platform/api build

echo "==> Restarting process manager"
if command -v pm2 >/dev/null 2>&1; then
  if [[ -n "${PM2_APP_NAME}" ]]; then
    pm2 restart "${PM2_APP_NAME}" --update-env
  elif pm2 describe fe-api >/dev/null 2>&1; then
    pm2 restart fe-api --update-env
  elif pm2 describe api >/dev/null 2>&1; then
    pm2 restart api --update-env
  elif pm2 describe felk-api >/dev/null 2>&1; then
    pm2 restart felk-api --update-env
  else
    echo "No known PM2 app name — restarting all"
    pm2 restart all --update-env
  fi
  pm2 save || true
elif [[ -f docker/docker-compose.yml ]]; then
  docker compose -f docker/docker-compose.yml up -d --build api
else
  echo "ERROR: Neither pm2 nor docker compose found."
  exit 1
fi

echo "==> Health check"
sleep 2
if curl -fsS "${HEALTH_URL}" >/dev/null; then
  echo "API healthy at ${HEALTH_URL}"
else
  echo "WARNING: health check failed at ${HEALTH_URL} — check pm2 logs"
  pm2 logs --lines 40 --nostream || true
  exit 1
fi

echo "==> Deploy complete"
