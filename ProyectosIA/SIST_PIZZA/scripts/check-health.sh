#!/usr/bin/env bash
set -euo pipefail

base=${1:-http://localhost:3000}

echo "Checking $base/health" && curl -sS -w "\nHTTP %{http_code}\n" "$base/health" || true

echo "Checking $base/api/health" && curl -sS -w "\nHTTP %{http_code}\n" "$base/api/health" || true

echo "Checking $base/metrics (head)" && curl -sS -I -w "\n" "$base/metrics" | head -n 5 || true
