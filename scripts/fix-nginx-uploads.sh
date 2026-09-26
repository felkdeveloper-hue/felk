#!/usr/bin/env bash
# Product photo uploads die in nginx before Node sees them.
#
# Any request body larger than nginx's in-memory buffer (~8–16KB) was written
# to a client-body temp path nginx could not use. nginx answered with a bare
# HTML 500 and no CORS headers, so the admin UI showed
# "Unable to reach the server. Check your connection."
#
# Safe to run more than once. Reloads nginx only after `nginx -t` passes.
set -euo pipefail

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx not installed; nothing to do"
  exit 0
fi

sudo mkdir -p /var/tmp/nginx-client-body
if id www-data >/dev/null 2>&1; then
  sudo chown www-data:www-data /var/tmp/nginx-client-body 2>/dev/null || true
fi
sudo chmod 1777 /var/tmp/nginx-client-body

DEST="/etc/nginx/conf.d/felk-upload-limits.conf"
if [[ -f "$DEST" ]]; then
  sudo cp "$DEST" "${DEST}.bak"
fi

write_conf() {
  printf '%s\n' "$1" | sudo tee "$DEST" >/dev/null
}

FULL='# Product photo uploads. Do not spool request bodies to a broken temp dir.
client_max_body_size 32m;
client_body_buffer_size 128k;
client_body_temp_path /var/tmp/nginx-client-body 1 2;
proxy_request_buffering off;
proxy_read_timeout 180s;
proxy_send_timeout 180s;'

STREAM_ONLY='# Product photo uploads. Stream the body to the API instead of spooling it.
proxy_request_buffering off;
proxy_read_timeout 180s;
proxy_send_timeout 180s;'

restore_previous() {
  if [[ -f "${DEST}.bak" ]]; then
    sudo mv "${DEST}.bak" "$DEST"
  else
    sudo rm -f "$DEST"
  fi
  sudo nginx -t >/dev/null 2>&1 || true
}

write_conf "$FULL"
if ! sudo nginx -t >/tmp/felk-nginx-test.txt 2>&1; then
  echo "Full upload snippet was rejected; trying stream-only snippet"
  cat /tmp/felk-nginx-test.txt || true
  write_conf "$STREAM_ONLY"
  if ! sudo nginx -t >/tmp/felk-nginx-test.txt 2>&1; then
    echo "WARNING: nginx rejected the upload snippet; previous config kept"
    cat /tmp/felk-nginx-test.txt || true
    restore_previous
    exit 1
  fi
fi

if ! sudo systemctl reload nginx 2>/dev/null; then
  sudo nginx -s reload
fi
echo "nginx reloaded"

{
  printf '%s' '{"ping":"'
  head -c 40000 /dev/zero | tr '\0' 'a'
  printf '%s' '"}'
} >/tmp/felk-nginx-body.json

code="$(
  curl -sS -o /tmp/felk-nginx-probe-out.txt -w '%{http_code}' --max-time 20 \
    -k --resolve "api.fe.lk:443:127.0.0.1" \
    -H "Content-Type: application/json" \
    -H "Origin: https://fe.lk" \
    --data-binary @/tmp/felk-nginx-body.json \
    -X POST "https://api.fe.lk/api/v1/catalog/products" \
    || echo "000"
)"
echo "40KB body probe status: ${code}"

if [[ "$code" == "500" ]] && grep -qi "nginx" /tmp/felk-nginx-probe-out.txt; then
  echo "WARNING: nginx still returns its own HTML 500 for a 40KB body"
  rm -f /tmp/felk-nginx-body.json /tmp/felk-nginx-probe-out.txt /tmp/felk-nginx-test.txt
  exit 1
fi

rm -f /tmp/felk-nginx-body.json /tmp/felk-nginx-probe-out.txt /tmp/felk-nginx-test.txt
echo "Upload proxy accepts request bodies past the old buffer limit"
