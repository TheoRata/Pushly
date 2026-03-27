#!/bin/bash
cd "$(dirname "$0")"
if ! command -v sf &> /dev/null; then
    echo "Salesforce CLI not found. Install: npm install @salesforce/cli -g"
    read -p "Press Enter to exit..."
    exit 1
fi
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Install from https://nodejs.org"
    read -p "Press Enter to exit..."
    exit 1
fi
[ ! -d "node_modules" ] && npm install
[ ! -d "server/node_modules" ] && cd server && npm install && cd ..
[ ! -d "client/dist" ] && npm run build
# Server opens browser itself via the `open` npm package
node server/index.js
