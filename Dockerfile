FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

FROM base AS deps

WORKDIR /workspace

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./

RUN pnpm install --frozen-lockfile

FROM deps AS build

WORKDIR /workspace

COPY . .

RUN pnpm nx run-many -t build --projects server --configuration production

FROM base AS runtime-base

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /workspace/dist ./dist
COPY --from=build /workspace/drizzle ./drizzle

FROM runtime-base AS server-runtime

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:8080/healthz').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "dist/apps/web/server/main.js"]

FROM server-runtime AS runtime
