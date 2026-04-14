#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run/cf"
TOKEN_FILE="${RUN_DIR}/openai-api-token.txt"

echo "PWA:            https://codex-connect-edge.wahtmelon.workers.dev"
echo "Broker WS:      wss://codex-connect-edge.wahtmelon.workers.dev/ws"
echo "Broker Health:  https://codex-connect-edge.wahtmelon.workers.dev/health"
echo "Models API:     https://codex-connect-edge.wahtmelon.workers.dev/v1/models"
echo "Local Pair UI:  http://127.0.0.1:4417/assets/connect.html"
echo "Local Status:   http://127.0.0.1:4417/api/pair/status"
if [[ -f "${TOKEN_FILE}" ]]; then
  echo "API Token File: ${TOKEN_FILE}"
else
  echo "API Token File: not provisioned"
fi
