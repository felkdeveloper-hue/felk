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

echo "==> Freeing disk space (deploys fail when the volume is full)"
df -h / | tail -1 || true
pm2 flush 2>/dev/null || true
rm -f "${HOME}/.pm2/logs/"*.log 2>/dev/null || true
rm -f /tmp/felk-import-* /tmp/core* 2>/dev/null || true
rm -rf "${APP_DIR}/.turbo" "${APP_DIR}/node_modules/.cache" "${APP_DIR}/apps/api/node_modules/.cache" 2>/dev/null || true
if command -v pnpm >/dev/null 2>&1; then
  pnpm store prune >/dev/null 2>&1 || true
fi
sudo journalctl --vacuum-size=50M >/dev/null 2>&1 || true
sudo apt-get clean >/dev/null 2>&1 || true
rm -f "${APP_DIR}/.git/index.lock" 2>/dev/null || true
df -h / | tail -1 || true

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

# Small EC2 instances OOM-kill `tsc` (exit 137). Ensure swap + free RAM first.
ensure_swap() {
  if swapon --show 2>/dev/null | grep -q .; then
    echo "==> Swap already active"
    return 0
  fi
  if [[ -f /swapfile ]]; then
    echo "==> Enabling existing /swapfile"
    sudo swapon /swapfile 2>/dev/null || true
    return 0
  fi
  echo "==> Creating 2G swapfile (tsc needs headroom on small instances)"
  sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
}

ensure_swap || echo "WARNING: could not enable swap — build may OOM on small instances"

echo "==> Pausing API during build to free RAM"
API_WAS_RUNNING=0
if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe api >/dev/null 2>&1; then
    API_WAS_RUNNING=1
    pm2 stop api 2>/dev/null || true
  fi
fi

restore_api_on_fail() {
  if [[ "${API_WAS_RUNNING}" -eq 1 ]] && command -v pm2 >/dev/null 2>&1; then
    echo "==> Build failed — restarting previous API process"
    pm2 restart api --update-env 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || true
  fi
}
trap restore_api_on_fail ERR

echo "==> Building API"
# Cap heap so Node competes less with the kernel OOM killer on 1–2GB boxes.
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
pnpm --filter @fe-platform/api build
trap - ERR

echo "==> Restarting process manager (zero-downtime preferred)"
if command -v pm2 >/dev/null 2>&1; then
  if [[ -f ecosystem.config.cjs ]]; then
    if pm2 describe api >/dev/null 2>&1; then
      # Prefer graceful restart over delete so nginx does not 502 mid-deploy.
      pm2 reload ecosystem.config.cjs --update-env || pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
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
if command -v pm2 >/dev/null 2>&1; then
  echo "==> Health failed — attempting to keep an API process listening"
  pm2 restart api --update-env 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || true
fi
exit 1
