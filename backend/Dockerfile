# Build context must be the repo root: docker build -f backend/Dockerfile .

# Stage 1: build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
ENV VITE_API_URL=
RUN npm run build

# Stage 2: install production deps (with build tools for native modules like better-sqlite3)
FROM node:22-alpine AS prod-deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Stage 3: final production image (no build tools — smaller image)
FROM node:22-alpine
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY backend/ .
COPY --from=frontend-build /build/frontend/dist ./public
RUN mkdir -p /app/data
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
