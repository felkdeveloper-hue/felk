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

echo "==> Restarting process manager (zero-downtime preferred)"
if command -v pm2 >/dev/null 2>&1; then
  if [[ -f ecosystem.config.cjs ]]; then
    if pm2 describe api >/dev/null 2>&1; then
      # Prefer graceful restart over delete so nginx does not 502 mid-deploy.
      pm2 reload ecosystem.config.cjs --update-env || pm2 restart ecosystem.config.cjs --update-env
    else
      pm2 delete fe-api 2>/dev/null || true
      pm2 delete felk-api 2>/dev/null || true
      pm2 start ecosystem.config.cjs
    fi
  elif [[ -n "${PM2_APP_NAME}" ]]; then
    pm2 reload "${PM2_APP_NAME}" --update-env || pm2 restart "${PM2_APP_NAME}" --update-env
  else
    echo "ERROR: ecosystem.config.cjs missing and no PM2_APP_NAME set."
    exit 1
  fi
  pm2 save || true
elif [[ -f docker/docker-compose.yml ]]; then
  docker compose -f docker/docker-compose.yml up -d --build api
else
  echo "ERROR: Neither pm2 nor docker compose found."
  exit 1
fi

echo "==> Health check"
HEALTH_TIMEOUT_SEC="${HEALTH_TIMEOUT_SEC:-60}"
HEALTH_INTERVAL_SEC="${HEALTH_INTERVAL_SEC:-2}"
MAX_ATTEMPTS=$((HEALTH_TIMEOUT_SEC / HEALTH_INTERVAL_SEC))
if [[ "${MAX_ATTEMPTS}" -lt 1 ]]; then
  MAX_ATTEMPTS=1
fi

health_started_at=$(date +%s)
attempt=1
http_code=""

while [[ "${attempt}" -le "${MAX_ATTEMPTS}" ]]; do
  echo "Waiting for API... (attempt ${attempt})"
  http_code="$(
    curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 5 "${HEALTH_URL}" 2>/dev/null || true
  )"

  if [[ "${http_code}" == "200" ]]; then
    health_elapsed=$(( $(date +%s) - health_started_at ))
    echo "API healthy at ${HEALTH_URL} (HTTP 200)"
    echo "API startup time: ${health_elapsed}s"
    echo "==> Deploy complete"
    exit 0
  fi

  if [[ "${attempt}" -lt "${MAX_ATTEMPTS}" ]]; then
    sleep "${HEALTH_INTERVAL_SEC}"
  fi
  attempt=$((attempt + 1))
done

health_elapsed=$(( $(date +%s) - health_started_at ))
echo "WARNING: health check failed at ${HEALTH_URL} after ${health_elapsed}s (last HTTP ${http_code:-none})"
pm2 logs --lines 40 --nostream || true
exit 1
