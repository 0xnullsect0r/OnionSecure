#!/usr/bin/env bash
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}🧅 OnionSecure${RESET}"
echo "────────────────────────────────────────"

# Bring up the stack
docker compose up -d --build

echo ""
echo "Waiting for Tor hidden service to initialize..."

# Poll the running tor container for the hostname file (up to 90 seconds).
# Uses exec (not run) so we connect to the already-running container without
# triggering the entrypoint again.
for i in $(seq 1 90); do
  HOSTNAME=$(docker compose exec -T tor cat /var/lib/tor/hidden_service/hostname 2>/dev/null || true)

  if [ -n "$HOSTNAME" ]; then
    echo ""
    echo -e "${GREEN}${BOLD}✅ OnionSecure is live!${RESET}"
    echo ""
    echo -e "  ${CYAN}${BOLD}https://${HOSTNAME}${RESET}"
    echo ""
    echo "Open the above address in Tor Browser."
    echo "Accept the self-signed certificate warning to proceed."
    echo ""
    echo -e "To get the address later, run: ${BOLD}./get-onion.sh${RESET}"
    echo ""
    exit 0
  fi

  sleep 1
done

echo ""
echo "⚠️  Timed out waiting for onion address. Run './get-onion.sh' once Tor finishes bootstrapping."
exit 1
