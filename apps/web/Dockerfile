# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:22-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# better-sqlite3 falls back to node-gyp when no prebuilt binary is found
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /src
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY lexicons ./lexicons
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @george/web build

FROM node:22-slim
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build /src /src
WORKDIR /src/apps/web
EXPOSE 3000
CMD ["node", "build"]
