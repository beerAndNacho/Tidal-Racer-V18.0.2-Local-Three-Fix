#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN=python3
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN=python
else
  printf '%s\n' 'Python 3 is required on macOS/Linux.' >&2
  exit 1
fi

printf '\n==============================================================\n'
printf '  TIDAL RACER V18.0.2 - LOCAL PLAY\n'
printf '==============================================================\n\n'

if ! "$PYTHON_BIN" prepare_vendor.py --check; then
  printf '\nBundled runtime is incomplete; attempting recovery...\n'
  "$PYTHON_BIN" prepare_vendor.py
fi

exec "$PYTHON_BIN" serve_local.py

