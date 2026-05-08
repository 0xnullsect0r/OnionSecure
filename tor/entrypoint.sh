#!/bin/sh
set -e

DATA_DIR=/var/lib/tor
HIDDEN_SERVICE_DIR="$DATA_DIR/hidden_service"

# Fix permissions on the (potentially freshly mounted) volume
mkdir -p "$HIDDEN_SERVICE_DIR"
chown -R debian-tor:debian-tor "$DATA_DIR"
chmod 700 "$DATA_DIR" "$HIDDEN_SERVICE_DIR"

# Wait for Tor to generate the hostname file, then print it once
(
  for i in $(seq 1 90); do
    if [ -f "$HIDDEN_SERVICE_DIR/hostname" ]; then
      ONION=$(cat "$HIDDEN_SERVICE_DIR/hostname")
      echo "================================================"
      echo "  OnionSecure onion address: https://$ONION"
      echo "================================================"
      exit 0
    fi
    sleep 1
  done
  echo "Warning: hostname file not found after 90 seconds" >&2
) &

exec gosu debian-tor tor -f /etc/tor/torrc "$@"
