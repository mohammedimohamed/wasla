# Stage 1: Install dependencies and build tools
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ sqlite-dev
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set env vars for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
# Ensures dynamic config points SQLite to the persistent path
ENV DB_PATH=/app/data/batimatec2026.db

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public directory and migrations
COPY --from=builder /app/public ./public
COPY --from=builder /app/migrations ./migrations

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Create directory for next.js runtime cache logs
RUN mkdir .next && chown nextjs:nodejs .next

# The standalone build automatically extracts minimal dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root
USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Note: server.js is created by next build from the standalone output
CMD ["node", "server.js"]
