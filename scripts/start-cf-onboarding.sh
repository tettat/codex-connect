#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PAIR_URL="http://127.0.0.1:4417/assets/connect.html"

bash "${ROOT_DIR}/scripts/start-cf-server-bg.sh"

echo
echo "desktop pair page: ${PAIR_URL}"
echo "phone pwa: https://codex-connect-edge.wahtmelon.workers.dev"

if command -v open >/dev/null 2>&1; then
  open "${PAIR_URL}" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${PAIR_URL}" >/dev/null 2>&1 || true
fi
