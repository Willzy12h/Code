#!/usr/bin/env bash
set -euo pipefail
# Uses locally installed Samsung Tizen Studio and a TV-bound Samsung certificate profile.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_PROFILE="${1:-}"
if [[ -z "$CERT_PROFILE" ]]; then
  echo 'Usage: bash scripts/package-wgt.sh <your-tizen-certificate-profile>' >&2
  exit 2
fi
if ! command -v tizen >/dev/null 2>&1; then
  echo 'Tizen CLI not installed. Install Tizen Studio Web CLI and Samsung Certificate Extension.' >&2
  exit 3
fi
cd "$ROOT"
npm run syntax
npm test
npm run build
echo 'Building Tizen web application…'
tizen build-web -- "$ROOT/dist/webapp"
echo 'Signing package using locally configured Samsung TV profile…'
tizen package -t wgt -s "$CERT_PROFILE" -- "$ROOT/dist/webapp/.buildResult"
echo 'Packaging finished. Check generated .wgt and verify the TV author/distributor certificate before installation.'
