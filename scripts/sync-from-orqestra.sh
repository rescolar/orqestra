#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="${HOME}/github/orqestra/"
TARGET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/"

if ! command -v rsync >/dev/null 2>&1; then
  echo "Error: rsync is required but not installed." >&2
  exit 1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Error: source directory not found: ${SOURCE_DIR}" >&2
  exit 1
fi

echo "Syncing from ${SOURCE_DIR} to ${TARGET_DIR}"

rsync -av \
  --exclude ".git/" \
  --exclude ".gitignore" \
  --exclude ".gitattributes" \
  --exclude ".gitmodules" \
  "${SOURCE_DIR}" "${TARGET_DIR}"

echo "Sync complete."
