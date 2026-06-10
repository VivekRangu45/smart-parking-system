# ── Stage 1: Build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Runtime ──
FROM node:20-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

# Do NOT copy .env or firebase-service-account.json into image;
# they should be mounted or passed via env vars at runtime.

EXPOSE 5000
USER appuser
CMD ["node", "src/app.js"]
