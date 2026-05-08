FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends tor gosu && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY torrc /etc/tor/torrc
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9050

ENTRYPOINT ["/entrypoint.sh"]
