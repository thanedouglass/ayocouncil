# Multi-stage Dockerfile for AyoCouncil

# Stage 1: Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root dependency files
COPY package*.json tsconfig.json ./

# Copy client dependency files and configs
COPY client/package*.json client/tsconfig*.json client/vite.config.ts client/postcss.config.js client/tailwind.config.js client/index.html ./client/

# Install root dependencies
RUN npm ci

# Install client dependencies
RUN cd client && npm ci

# Copy root and client source files
COPY src ./src
COPY client/src ./client/src

# Compile backend and frontend
RUN npm run build
RUN npm run client:build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production-only dependencies for root
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled backend output from builder
COPY --from=builder /app/dist ./dist

# Copy compiled client SPA assets from builder
COPY --from=builder /app/client/dist ./client/dist

# Expose internal port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the unified AyoCouncil server
CMD ["node", "dist/index.js"]
