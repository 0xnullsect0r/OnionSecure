#!/usr/bin/env bash
set -euo pipefail

HOSTNAME=$(docker compose exec -T tor cat /var/lib/tor/hidden_service/hostname 2>/dev/null || true)

if [ -z "$HOSTNAME" ]; then
  echo "⚠️  Onion address not yet available. Is the stack running? (docker compose up -d)" >&2
  exit 1
fi

echo "https://${HOSTNAME}"
