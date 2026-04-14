#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run/cf"
PID_FILE="${RUN_DIR}/server.pid"
LABEL="com.codexconnect.cf.local"

if command -v launchctl >/dev/null 2>&1; then
  if launchctl remove "${LABEL}" >/dev/null 2>&1; then
    rm -f "${PID_FILE}"
    echo "stopped cf local server: label=${LABEL}"
    exit 0
  fi
fi

if [[ -f "${PID_FILE}" ]]; then
  PID="$(cat "${PID_FILE}")"
  if [[ -n "${PID}" ]] && kill -0 "${PID}" 2>/dev/null; then
    kill "${PID}"
    echo "stopped cf local server: pid=${PID}"
  else
    echo "stale pid file removed"
  fi
  rm -f "${PID_FILE}"
  exit 0
fi

echo "cf local server is not running"
