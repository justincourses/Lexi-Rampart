#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm i && npm run dev
