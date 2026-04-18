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
# socat bridges IPv4 port 1717 (where Docker port forwarding lands) to IPv6
# localhost [::1]:1717 (where sf CLI's OAuth callback server binds). Without
# this, OAuth redirects from the host browser cannot reach sf inside the
# container because sf binds to loopback only.
RUN apt-get update \
    && apt-get install -y --no-install-recommends socat \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @salesforce/cli

# Fake firefox wrapper for headless login.
# SF CLI v2.130+ hard-fails with CannotOpenBrowserError in Docker instead of
# printing the OAuth URL. We shim --browser firefox with a script that writes
# the URL to $PUSHLY_URL_FILE so the backend can send it to the frontend popup.
RUN printf '#!/bin/sh\n# Pushly fake browser: capture URL to file for headless login\nfor arg in "$@"; do url="$arg"; done\necho "$url" > "${PUSHLY_URL_FILE:-/tmp/pushly-sf-login-url}"\n' > /usr/local/bin/firefox \
    && chmod +x /usr/local/bin/firefox

# Entrypoint: run socat bridge in background, then start the Node server.
# The bridge listens on the container's eth0 IPv4 address:1717 (where Docker
# port-forward delivers external traffic) and connects to IPv6 [::1]:1717
# (where sf CLI binds its OAuth callback server). Binding to eth0's specific
# IP (not 0.0.0.0) avoids dual-stack conflicts with sf's [::1] binding.
RUN printf '#!/bin/sh\nset -e\nIP=$(hostname -i | awk "{print \\$1}")\necho "[pushly] bridging $IP:1717 -> [::1]:1717"\nsocat TCP4-LISTEN:1717,fork,reuseaddr,bind=$IP TCP6:[::1]:1717 &\nexec node server/index.js\n' > /usr/local/bin/pushly-entrypoint.sh \
    && chmod +x /usr/local/bin/pushly-entrypoint.sh

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

CMD ["/usr/local/bin/pushly-entrypoint.sh"]
