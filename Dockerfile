# Base Image
FROM node:20-alpine AS builder

# 1. Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite-dev

# 2. Set working directory
WORKDIR /app

# 3. Copy dependencies and install
COPY package.json package-lock.json* ./
RUN npm install

# 4. Copy source code and build Next.js
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# ── RUNTIME IMAGE ──
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 1. Copy necessary files from the builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# 2. Persistent storage directory for SQLite (mounted via Render Disk)
RUN mkdir -p /app/data && chown -R node:node /app/data

# 3. Securely run as a non-root user
USER node

# 4. Start the application
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

CMD ["npm", "start"]
