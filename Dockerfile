# Production Dockerfile for Next.js app
# Build stage
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false --silent

# Copy source and build
COPY . .
RUN npm run build

# Runner stage
FROM node:18-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Use PORT from environment (Cloud Run sets this)
EXPOSE 8080
CMD ["sh", "-c", "npx next start -p ${PORT:-8080}"]
