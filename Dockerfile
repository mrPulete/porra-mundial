# ── Stage 1: Dependencies ──
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# bcrypt/prisma native dependencies on Debian
RUN apt-get update \
	&& apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build ──
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# Remove dev dependencies first, then regenerate Prisma client so .prisma artifacts remain.
RUN npm prune --omit=dev && npm cache clean --force
RUN npx prisma generate --schema=prisma/schema.prisma

# ── Stage 3: Production ──
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma schema + migrations (needed for runtime migrate)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy data files needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Copy runtime node_modules from builder (includes generated Prisma client)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy generated Prisma artifacts explicitly to avoid missing client initialization at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy source files needed by seed script (tsx runtime)
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/emails ./emails
COPY --from=builder --chown=nextjs:nodejs /app/types ./types

# Copy entrypoint
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
