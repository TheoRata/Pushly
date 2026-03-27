@echo off
cd /d "%~dp0"
where sf >nul 2>nul || (echo Salesforce CLI not found. Install: npm install @salesforce/cli -g & pause & exit)
where node >nul 2>nul || (echo Node.js not found. Install from https://nodejs.org & pause & exit)
if not exist node_modules npm install
if not exist server\node_modules (cd server && npm install && cd ..)
if not exist client\dist npm run build
:: Server opens browser itself via the `open` npm package
node server/index.js
