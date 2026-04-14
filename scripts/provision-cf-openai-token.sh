#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="${ROOT_DIR}/.run/cf"
TOKEN_FILE="${RUN_DIR}/openai-api-token.txt"
SOURCE_ENV_FILE="${SOURCE_ENV_FILE:-/Users/waht/Code/misty-world/.env}"
CF_WORKER_DIR="${ROOT_DIR}/cf-worker"

mkdir -p "${RUN_DIR}"

if [[ $# -ge 1 && -n "${1}" ]]; then
  TOKEN_VALUE="${1}"
elif [[ -f "${TOKEN_FILE}" ]]; then
  TOKEN_VALUE="$(cat "${TOKEN_FILE}")"
else
  TOKEN_VALUE="ccx_$(openssl rand -hex 24)"
fi

printf '%s' "${TOKEN_VALUE}" > "${TOKEN_FILE}"
chmod 600 "${TOKEN_FILE}"

if [[ ! -f "${SOURCE_ENV_FILE}" ]]; then
  echo "source env file not found: ${SOURCE_ENV_FILE}" >&2
  exit 1
fi

if [[ ! -f "${CF_WORKER_DIR}/wrangler.toml" ]]; then
  echo "worker config not found: ${CF_WORKER_DIR}/wrangler.toml" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${SOURCE_ENV_FILE}"
set +a

cd "${CF_WORKER_DIR}"
printf '%s' "${TOKEN_VALUE}" | wrangler secret put BROKER_OPENAI_API_TOKEN

echo "provisioned BROKER_OPENAI_API_TOKEN"
echo "token file: ${TOKEN_FILE}"
