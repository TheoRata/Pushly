# Stage 1: Build the Vue client
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY client/ client/
RUN cd client && npx vite build

# Stage 2: Production image with SF CLI
FROM node:20-alpine
RUN npm install -g @salesforce/cli
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN cd server && npm ci --omit=dev
COPY server/ server/
COPY pushly.sh ./
COPY --from=builder /app/client/dist client/dist

# Create data directory for SQLite and rollbacks
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PUSHLY_DATA_DIR=/app/data
EXPOSE 3000

CMD ["node", "server/index.js"]
