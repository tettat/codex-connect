#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run/cf"
PID_FILE="${RUN_DIR}/server.pid"
LOG_FILE="${RUN_DIR}/server.log"
LABEL="com.codexconnect.cf.local"
STATUS_URL="http://127.0.0.1:4417/api/pair/status"

mkdir -p "${RUN_DIR}"

if curl -fsS "${STATUS_URL}" >/dev/null 2>&1; then
  echo "cf local server already responding"
  echo "status: ${STATUS_URL}"
  echo "log: ${LOG_FILE}"
  exit 0
fi

if command -v launchctl >/dev/null 2>&1; then
  launchctl remove "${LABEL}" >/dev/null 2>&1 || true
  : > "${LOG_FILE}"
  launchctl submit -l "${LABEL}" -- /bin/bash -lc "cd '${ROOT_DIR}' && exec '${ROOT_DIR}/scripts/start-cf-server.sh' '${1:-}' >> '${LOG_FILE}' 2>&1"

  for _ in {1..20}; do
    if curl -fsS "${STATUS_URL}" >/dev/null 2>&1; then
      echo "cf local server started via launchctl: label=${LABEL}"
      echo "log: ${LOG_FILE}"
      echo "status: ${STATUS_URL}"
      exit 0
    fi
    sleep 1
  done

  echo "failed to start cf local server via launchctl" >&2
  tail -n 120 "${LOG_FILE}" >&2 || true
  exit 1
fi

if [[ -f "${PID_FILE}" ]]; then
  EXISTING_PID="$(cat "${PID_FILE}")"
  if [[ -n "${EXISTING_PID}" ]] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
    echo "cf local server already running: pid=${EXISTING_PID}"
    echo "log: ${LOG_FILE}"
    exit 0
  fi
  rm -f "${PID_FILE}"
fi

nohup bash "${ROOT_DIR}/scripts/start-cf-server.sh" "${1:-}" > "${LOG_FILE}" 2>&1 < /dev/null &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"
disown "${SERVER_PID}" 2>/dev/null || true

for _ in {1..20}; do
  if curl -fsS "${STATUS_URL}" >/dev/null 2>&1; then
    echo "cf local server started: pid=${SERVER_PID}"
    echo "log: ${LOG_FILE}"
    echo "status: ${STATUS_URL}"
    exit 0
  fi
  sleep 1
done

echo "failed to start cf local server" >&2
tail -n 120 "${LOG_FILE}" >&2 || true
exit 1
