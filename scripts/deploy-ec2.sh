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

echo "==> Reloading process manager (zero-downtime when cluster + wait_ready)"
if command -v pm2 >/dev/null 2>&1; then
  # Prefer ecosystem reload: old workers keep serving until new ones signal ready.
  if [[ -f ecosystem.config.cjs ]]; then
    pm2 startOrReload ecosystem.config.cjs --update-env
  elif [[ -n "${PM2_APP_NAME}" ]]; then
    pm2 reload "${PM2_APP_NAME}" --update-env || pm2 restart "${PM2_APP_NAME}" --update-env
  elif pm2 describe api >/dev/null 2>&1; then
    pm2 reload api --update-env || pm2 restart api --update-env
  elif pm2 describe fe-api >/dev/null 2>&1; then
    pm2 reload fe-api --update-env || pm2 restart fe-api --update-env
  elif pm2 describe felk-api >/dev/null 2>&1; then
    pm2 reload felk-api --update-env || pm2 restart felk-api --update-env
  else
    echo "No known PM2 app — starting from ecosystem or restarting all"
    if [[ -f ecosystem.config.cjs ]]; then
      pm2 start ecosystem.config.cjs
    else
      pm2 restart all --update-env
    fi
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
