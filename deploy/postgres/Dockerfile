# Postgres 17 + WAL-G, for continuous WAL archiving and point-in-time restore (restore-safety design 3.1).
# Built on the VPS by an ops step before `deploy.sh` (it runs `compose up` without --build):
#   docker compose -p wordmet -f deploy/compose.prod.yml build postgres
# The binary is fetched here, at build time, and checked against a fixed sha256: a wrong sum fails the build.
FROM postgres:17

ARG WALG_VERSION=v3.0.9
ARG WALG_ASSET=wal-g-pg-22.04-amd64
ARG WALG_SHA256=4f03ee4679db7f660bfd1b2b8291ac5df247cd2ec48074b60c112f4897299f24

# postgres:17 ships no root CAs. Without ca-certificates wal-g cannot verify the TLS of R2 and retries forever
# without a clear error, so this package is required, not optional.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL -o /tmp/walg.tar.gz "https://github.com/wal-g/wal-g/releases/download/${WALG_VERSION}/${WALG_ASSET}.tar.gz" \
    && echo "${WALG_SHA256}  /tmp/walg.tar.gz" | sha256sum -c - \
    && tar -xzf /tmp/walg.tar.gz -C /tmp \
    && install -m 0755 "/tmp/${WALG_ASSET}" /usr/local/bin/wal-g \
    && rm -rf /tmp/walg.tar.gz "/tmp/${WALG_ASSET}" \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

RUN wal-g --version
