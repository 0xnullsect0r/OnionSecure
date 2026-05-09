#!/usr/bin/env bash
set -euo pipefail

echo "Waiting for Tor hidden service hostname..." >&2

for i in $(seq 1 90); do
  HOSTNAME=$(docker compose exec -T tor cat /var/lib/tor/hidden_service/hostname 2>/dev/null || true)
  if [ -n "$HOSTNAME" ]; then
    echo ""
    echo "  https://${HOSTNAME}"
    echo ""
    echo "Open in Tor Browser. Accept the self-signed certificate warning." >&2
    exit 0
  fi
  sleep 1
done

echo "⚠️  Timed out. Is the stack running? (docker compose up -d)" >&2
exit 1
