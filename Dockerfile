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
# node:20-slim (Debian) is required — SF CLI bundles glibc-native binaries
# that silently fail on Alpine (musl libc)
FROM node:20-slim
RUN npm install -g @salesforce/cli

# Fake firefox wrapper for headless login.
# SF CLI v2.130+ hard-fails with CannotOpenBrowserError in Docker instead of
# printing the OAuth URL. We shim --browser firefox with a script that writes
# the URL to $PUSHLY_URL_FILE so the backend can send it to the frontend popup.
RUN printf '#!/bin/sh\n# Pushly fake browser: capture URL to file for headless login\nfor arg in "$@"; do url="$arg"; done\necho "$url" > "${PUSHLY_URL_FILE:-/tmp/pushly-sf-login-url}"\n' > /usr/local/bin/firefox \
    && chmod +x /usr/local/bin/firefox

WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev
COPY server/ server/
COPY pushly.sh ./
COPY --from=builder /app/client/dist client/dist

# Create data directory for SQLite and rollbacks
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PUSHLY_DATA_DIR=/app/data
EXPOSE 3000
# Port 1717 is used by the Salesforce CLI's OAuth callback server when logging
# in from the Pushly web UI. Must be mapped on the host for browser-based login.
EXPOSE 1717

CMD ["node", "server/index.js"]
