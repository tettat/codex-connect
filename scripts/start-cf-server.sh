#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_BROKER_URL="wss://codex-connect-edge.wahtmelon.workers.dev/ws"
BROKER_URL="${1:-${CF_BROKER_URL:-${DEFAULT_BROKER_URL}}}"

RUN_DIR="${ROOT_DIR}/.run/cf"
mkdir -p "$RUN_DIR"

PAIR_SERVER_NAME="${PAIR_SERVER_NAME:-$(scutil --get ComputerName 2>/dev/null || hostname)} CF"
CF_LOCAL_PORT="${CF_LOCAL_PORT:-4417}"
CF_LOCAL_HOST="${CF_LOCAL_HOST:-127.0.0.1}"

echo "[cf-local] host=${CF_LOCAL_HOST} port=${CF_LOCAL_PORT} broker=${BROKER_URL}"
echo "[cf-local] state=${RUN_DIR}"
echo "[cf-local] pwa=https://codex-connect-edge.wahtmelon.workers.dev"

cd "$ROOT_DIR"
PAIR_BROKER_URL="$BROKER_URL" \
PAIR_SERVER_NAME="$PAIR_SERVER_NAME" \
PORT="$CF_LOCAL_PORT" \
HOST="$CF_LOCAL_HOST" \
TRUST_STORE_PATH="${RUN_DIR}/broker-state.json" \
CHAT_TASK_STORE_PATH="${RUN_DIR}/chat-tasks.json" \
DEVICE_SETTINGS_PATH="${RUN_DIR}/device-settings.json" \
node server.mjs
