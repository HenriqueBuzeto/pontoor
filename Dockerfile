FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/lib/auth/password.ts ./lib/auth/password.ts
COPY --from=builder /app/lib/auth/constants.ts ./lib/auth/constants.ts
COPY --from=builder /app/lib/db/migrations ./lib/db/migrations
COPY --from=builder /app/lib/db/schema ./lib/db/schema
COPY --from=builder /app/lib/db/index.ts ./lib/db/index.ts
COPY --from=builder /app/lib/db/seed.ts ./lib/db/seed.ts
COPY --from=builder /app/lib/db/create-admin.ts ./lib/db/create-admin.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
