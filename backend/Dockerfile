# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Runtime ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8787
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
EXPOSE 8787
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
