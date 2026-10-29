#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-}"
if [[ -z "$PROFILE" || ! "$PROFILE" =~ ^[A-Za-z0-9][A-Za-z0-9_.\ -]*$ ]]; then
  printf '%s\n' 'Usage: bash scripts/package-wgt.sh <existing-Samsung-TV-profile>' >&2; exit 2
fi
command -v tizen >/dev/null || { echo 'Tizen Web CLI not on PATH.' >&2; exit 3; }
cd "$ROOT"
npm run syntax
npm test
npm run build
tizen build-web -- "$ROOT/dist/webapp"
tizen package -t wgt -s "$PROFILE" -- "$ROOT/dist/webapp/.buildResult"
echo 'SDK packaging completed. Check the generated WGT and author/distributor signatures before installing.'
echo 'This does not confirm Samsung TV authorisation or hardware behaviour.'
