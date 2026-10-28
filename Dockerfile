# syntax=docker/dockerfile:1.7
# One Dockerfile for the three apps; pick one with `target:` (see docker-compose.yml, profile `app`).
#   api    NestJS API + worker (apps/api). Builds when the container starts, because `prisma generate --sql` (TypedSQL)
#          must read the live database, which does not exist at image-build time.
#   admin  Vite build of apps/admin, served by nginx.
#   web    Next build of apps/web (learner app on), served by `next start`.
# Build context is the repo root (the pnpm workspace needs the root lockfile).

ARG NODE_VERSION=24.11.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
# openssl: Prisma. Keep pnpm at the version the repo pins (CLAUDE.md, Landing).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@11.6.0 --activate
ENV PNPM_HOME=/pnpm
RUN pnpm config set store-dir /pnpm/store
WORKDIR /app

# Only the manifests, so an unchanged lockfile keeps the install layer cached when source changes.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/web/package.json apps/web/
COPY packages/design-tokens/package.json packages/design-tokens/

# ---- api -------------------------------------------------------------------------------------------------------------
FROM manifests AS api-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter "api..."

FROM api-deps AS api
COPY apps/api apps/api
WORKDIR /app/apps/api
# Compose overrides this only for the one-off commands (seed, admin grant). The API and the worker run together
# (scripts/run-dev.mjs), the same way `pnpm run:dev` runs them on a host.
CMD ["sh", "-c", "pnpm db:setup && pnpm build && node scripts/run-dev.mjs"]

# ---- admin -----------------------------------------------------------------------------------------------------------
FROM manifests AS admin-build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter "admin..."
COPY packages packages
COPY apps/admin apps/admin
WORKDIR /app/apps/admin
# The URL is written into the bundle. `--mode docker` (not production) lets it be http://localhost:<port>: a production
# build must use an `admin-api.` host (apps/admin/src/resolve-api-base-url.ts).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm exec vite build --mode docker

FROM nginx:1.27-alpine AS admin
COPY docker/admin.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=admin-build /app/apps/admin/dist /usr/share/nginx/html

# ---- web (learner app) -----------------------------------------------------------------------------------------------
FROM manifests AS web
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter "web..."
COPY packages packages
COPY apps/web apps/web
WORKDIR /app/apps/web
# NEXT_PUBLIC_* are written into the bundle at build time. The landing page's waitlist needs Cloudflare D1, which
# `next start` does not provide; the learner app under /vi/app and /en/app only talks to the API.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_LEARNER_APP=on
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_LEARNER_APP=${NEXT_PUBLIC_LEARNER_APP} \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec next build
ENV NODE_ENV=production
CMD ["pnpm", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3001"]
