# SF Deploy Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web UI that wraps the Salesforce CLI, letting CLI-shy admins retrieve and deploy metadata between orgs via guided wizard flows.

**Architecture:** Vue 3 + Tailwind frontend communicates via REST + WebSocket with a Node.js/Express backend that spawns `sf` CLI commands. History is stored as individual JSON files in a shared folder. Dark theme with purple/indigo accents.

**Tech Stack:** Vue 3, Vite, Tailwind CSS, Node.js, Express, ws (WebSocket), open (browser launcher)

**Spec:** `docs/superpowers/specs/2026-03-24-sf-deploy-manager-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `server/index.js`
- Create: `server/package.json`
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.js`
- Create: `client/src/App.vue`
- Create: `client/src/router/index.js`
- Create: `client/src/assets/main.css`

- [ ] **Step 1: Initialize root package.json with workspace scripts**

```json
{
  "name": "sf-deploy-manager",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && node --watch index.js",
    "dev:client": "cd client && npx vite",
    "build": "cd client && npx vite build",
    "start": "node server/index.js",
    "test": "cd server && npx vitest run"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Initialize server package.json and install deps**

```json
{
  "name": "sf-deploy-manager-server",
  "private": true,
  "type": "module",
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "open": "^10.1.0",
    "uuid": "^11.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit && npm install && cd server && npm install`

- [ ] **Step 3: Create minimal Express server with port detection and browser open**

Create `server/index.js`:
```js
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Serve built client in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log('WS message:', data.toString());
  });
});

// Try ports 3000-3010
async function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      console.log(`SF Deploy Manager running at http://localhost:${port}`);
      open(`http://localhost:${port}`);
      resolve(port);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE' && port < 3010) {
        resolve(startServer(port + 1));
      } else {
        reject(err);
      }
    });
  });
}

startServer();

export { app, server, wss };
```

- [ ] **Step 4: Scaffold Vue 3 + Vite + Tailwind client**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit && cd client && npm create vite@latest . -- --template vue && npm install && npm install -D tailwindcss @tailwindcss/vite`

- [ ] **Step 5: Configure Tailwind with dark theme tokens**

Create `client/src/assets/main.css`:
```css
@import "tailwindcss";

:root {
  --bg-base: #0f0f1a;
  --bg-primary: #1e1e2e;
  --bg-surface: #252536;
  --bg-elevated: #2a2a3e;
  --color-primary: #6366f1;
  --color-secondary: #a855f7;
  --color-success: #4ade80;
  --color-error: #f87171;
  --color-warning: #fbbf24;
  --text-primary: #e2e8f0;
  --text-secondary: #a0a0b8;
  --text-muted: #71717a;
}

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
}
```

Update `client/vite.config.js`:
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': { target: 'ws://localhost:3000', ws: true }
    }
  }
})
```

- [ ] **Step 6: Create App.vue shell with sidebar and router-view**

Create `client/src/App.vue`:
```vue
<script setup>
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <div class="flex h-screen bg-[var(--bg-base)]">
    <Sidebar />
    <main class="flex-1 overflow-auto p-6">
      <router-view />
    </main>
  </div>
</template>
```

- [ ] **Step 7: Create Sidebar component with icon + label navigation**

Create `client/src/components/Sidebar.vue` — icon sidebar with 4 nav items (Orgs, Retrieve, Deploy, History) using SVG icons and text labels. Active route highlighted with indigo. Logo at top.

- [ ] **Step 8: Create router with 4 page stubs**

Create `client/src/router/index.js` with routes: `/` (Orgs), `/retrieve` (Retrieve), `/deploy` (Deploy), `/history` (History). Each view is a stub `<h1>Page Name</h1>`.

Create stub views:
- `client/src/views/OrgsPage.vue`
- `client/src/views/RetrievePage.vue`
- `client/src/views/DeployPage.vue`
- `client/src/views/HistoryPage.vue`

- [ ] **Step 9: Wire up main.js with router and CSS**

```js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

createApp(App).use(router).mount('#app')
```

- [ ] **Step 10: Verify dev setup works**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit && npm run dev`
Expected: Server on :3000, Vite on :5173 with proxy, sidebar + stub pages render, navigation works.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Express, Vue 3, Tailwind, and sidebar navigation"
```

---

## Task 2: SF CLI Wrapper Service

**Files:**
- Create: `server/services/sf-cli.js`
- Create: `server/utils/prerequisites.js`
- Create: `server/utils/error-translator.js`
- Create: `server/tests/sf-cli.test.js`
- Create: `server/tests/error-translator.test.js`

- [ ] **Step 1: Write tests for error-translator**

Create `server/tests/error-translator.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { translateError } from '../utils/error-translator.js';

describe('translateError', () => {
  it('translates FIELD_INTEGRITY_EXCEPTION', () => {
    const result = translateError('FIELD_INTEGRITY_EXCEPTION: some detail');
    expect(result.code).toBe('FIELD_INTEGRITY_EXCEPTION');
    expect(result.plain).toContain('required field');
    expect(result.action).toBeTruthy();
  });

  it('returns raw message for unknown errors', () => {
    const result = translateError('WEIRD_ERROR: something');
    expect(result.code).toBe('UNKNOWN');
    expect(result.raw).toContain('WEIRD_ERROR');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/server && npx vitest run tests/error-translator.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement error-translator.js**

Create `server/utils/error-translator.js` with the lookup table from the spec (8 error codes). Export `translateError(rawMessage)` that returns `{ code, plain, action, raw }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/server && npx vitest run tests/error-translator.test.js`
Expected: PASS.

- [ ] **Step 5: Implement prerequisites.js**

Create `server/utils/prerequisites.js`. Export `checkPrerequisites()` that:
- Runs `sf --version` via `child_process.execSync`
- Checks Node version >= 18
- Returns `{ ok: boolean, checks: [{ name, status, message }] }`

- [ ] **Step 6: Implement sf-cli.js service**

Create `server/services/sf-cli.js`. This is the core CLI wrapper. Export:

```js
// Runs an sf command and returns parsed JSON result
export async function sfCommand(args, options = {})

// Runs an sf command and streams stdout line-by-line via callback
export async function sfCommandStream(args, onData, options = {})

// Specific commands:
export async function listOrgs()
export async function orgDisplay(alias)
export async function orgLoginWeb(alias, instanceUrl)
export async function listMetadataTypes(orgAlias)
export async function listMetadata(orgAlias, metadataType)
export async function retrieveMetadata(orgAlias, components, workspacePath)
export async function deployMetadata(targetOrg, workspacePath, options = {})
export async function validateDeploy(targetOrg, workspacePath)
```

Each function spawns `sf` via `child_process.spawn` with `--json` where applicable. `sfCommandStream` streams raw stdout for the progress log. All functions handle errors and pass them through `translateError`.

- [ ] **Step 7: Commit**

```bash
git add server/services/sf-cli.js server/utils/error-translator.js server/utils/prerequisites.js server/tests/
git commit -m "feat: add SF CLI wrapper service, error translator, and prerequisites checker"
```

---

## Task 3: Workspace & History Services

**Files:**
- Create: `server/services/workspace.js`
- Create: `server/services/history.js`
- Create: `server/services/lock.js`
- Create: `server/services/rollback.js`
- Create: `server/services/bundles.js`
- Create: `server/tests/history.test.js`
- Create: `server/tests/workspace.test.js`

- [ ] **Step 1: Write tests for history service**

Create `server/tests/history.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { writeRecord, readRecords, readRecord } from '../services/history.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('history', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-'));
  });

  it('writes and reads a record', () => {
    const record = { id: 'test-1', type: 'deploy', status: 'success', user: 'john' };
    writeRecord(record, testDir);
    const records = readRecords({ dataDir: testDir });
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('test-1');
  });

  it('filters by status', () => {
    writeRecord({ id: 'r1', status: 'success', startedAt: new Date().toISOString() }, testDir);
    writeRecord({ id: 'r2', status: 'failed', startedAt: new Date().toISOString() }, testDir);
    const failed = readRecords({ dataDir: testDir, status: 'failed' });
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe('r2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/server && npx vitest run tests/history.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement history.js**

Create `server/services/history.js`. Each operation gets its own JSON file in `data/history/`.

```js
export function writeRecord(record, dataDir)    // writes data/history/{id}.json
export function readRecords(filters)             // scans dir, parses each JSON file (skips corrupt/partial files gracefully for OneDrive sync tolerance), filters by user/org/status/dateRange
export function readRecord(id, dataDir)          // reads single file
export function archiveOldRecords(dataDir, maxAgeDays = 180)  // moves files older than 6 months to data/history/archive/
```

`readRecords` scans the directory, parses each JSON file, applies filters, sorts by `startedAt` descending.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/server && npx vitest run tests/history.test.js`
Expected: PASS.

- [ ] **Step 5: Implement workspace.js**

Create `server/services/workspace.js`:
```js
export function createWorkspace(username, orgAlias)  // creates workspaces/{user}/{org}-{ts}/ with sfdx-project.json
export function getWorkspace(workspaceId)             // returns workspace path
export function listWorkspaces(username)              // lists recent workspaces
export function cleanupOldWorkspaces(maxAgeDays = 30) // deletes old ones
```

Auto-generates `sfdx-project.json` inside each workspace.

- [ ] **Step 6: Implement lock.js**

Create `server/services/lock.js`:
```js
export function acquireLock(orgAlias, user, components, dataDir)  // writes lock file, returns { acquired, existingLock }
export function releaseLock(orgAlias, dataDir)                     // deletes lock file
export function checkLock(orgAlias, dataDir)                       // reads lock, checks staleness (>30min)
export function cleanupStaleLocks(dataDir)                         // cleans up on startup
```

- [ ] **Step 7: Implement rollback.js**

Create `server/services/rollback.js`:
```js
export function createSnapshot(deployId, orgAlias, components, dataDir)  // retrieves current state from target org
export function getRollbackPath(deployId, dataDir)                        // returns snapshot path
export function cleanupOldSnapshots(maxAgeDays = 90, dataDir)             // deletes old snapshots
```

- [ ] **Step 8: Create user identity service**

Create `server/services/user.js`:
```js
export function getCurrentUser()  // returns os.userInfo().username
export function getStoredUsername(dataDir)  // reads data/.username if exists
export function setStoredUsername(name, dataDir)  // writes data/.username
export function resolveUser(dataDir)  // returns stored username or falls back to OS username
```

On first API request, if no stored username exists and the OS username looks generic (e.g., "admin", "user"), the frontend will be signaled to prompt for a name.

- [ ] **Step 9: Implement bundles.js**

Create `server/services/bundles.js`:
```js
export function listBundles(dataDir)                    // scans data/bundles/*.json
export function getBundle(name, dataDir)                 // reads one
export function saveBundle(name, components, dataDir)    // writes data/bundles/{name}.json
export function deleteBundle(name, dataDir)              // deletes file
```

- [ ] **Step 9: Commit**

```bash
git add server/services/ server/tests/
git commit -m "feat: add workspace, history, lock, rollback, and bundles services"
```

---

## Task 4: Backend API Routes

**Files:**
- Create: `server/routes/orgs.js`
- Create: `server/routes/metadata.js`
- Create: `server/routes/retrieve.js`
- Create: `server/routes/deploy.js`
- Create: `server/routes/history.js`
- Create: `server/routes/bundles.js`
- Modify: `server/index.js` — mount all routes

- [ ] **Step 1: Create orgs routes**

Create `server/routes/orgs.js`:
- `GET /api/orgs` — calls `sf org list --json`, enriches with health status
- `POST /api/orgs/connect` — starts the OAuth flow:
  1. Backend spawns `sf org login web --alias {alias} --instance-url {url}` as a child process
  2. The `sf` CLI starts its own local callback server and opens the browser for Salesforce login
  3. Backend returns `{ status: 'authenticating', alias }` immediately
  4. Frontend polls `GET /api/orgs/:alias/health` every 2 seconds until it returns `connected`
  5. Once connected, frontend stops polling and shows success
  6. If no connection after 120 seconds, frontend shows "Authentication timed out. Try again."
- `POST /api/orgs/:alias/refresh` — same OAuth flow as connect, re-authenticates expired org
- `DELETE /api/orgs/:alias` — calls `sf org logout --target-org {alias}`
- `GET /api/orgs/:alias/health` — calls `sf org display --target-org {alias} --json`, returns connection status

- [ ] **Step 2: Create metadata routes**

Create `server/routes/metadata.js`:
- `GET /api/metadata/:orgAlias/types` — calls `sf org list metadata-types`, groups into categories per spec §5.2
- `GET /api/metadata/:orgAlias/components?type=Flow` — calls `sf org list metadata --metadata-type {type}`
- `GET /api/metadata/:orgAlias/search?q=Lead` — searches cached metadata across all types
- `POST /api/metadata/:orgAlias/refresh` — clears cache, reloads

Uses an in-memory cache (Map) per org, expires after 1 hour.

- [ ] **Step 3: Create retrieve routes**

Create `server/routes/retrieve.js`:
- `GET /api/retrieve` — lists recent retrieve operations for the current user (reads from history, filters by type=retrieve and current username)
- `POST /api/retrieve` — body: `{ orgAlias, components, mode }`. Creates workspace, runs `sf project retrieve start`, streams progress via WebSocket, writes history record.
- `GET /api/retrieve/:id/status` — returns current operation state

Operations are tracked in a Map: `operationId -> { status, components, log, result }`.

- [ ] **Step 4: Create deploy routes**

Create `server/routes/deploy.js`:
- `POST /api/deploy/validate` — body: `{ targetOrg, workspacePath }`. Runs `sf project deploy start --dry-run --json`.
- `POST /api/deploy` — body: `{ targetOrg, workspacePath, components }`. Acquires lock, creates rollback snapshot, deploys, releases lock, writes history.
- `POST /api/deploy/:id/retry-failed` — re-deploys only failed components from a previous deploy.
- `POST /api/deploy/:id/rollback` — deploys the rollback snapshot back to the target org.
- `GET /api/deploy/:id/status` — returns current operation state.

- [ ] **Step 5: Create history routes**

Create `server/routes/history.js`:
- `GET /api/history` — query params: `user`, `org`, `status`, `from`, `to`. Calls `readRecords` with filters.
- `GET /api/history/:id` — calls `readRecord`.

- [ ] **Step 6: Create bundles routes**

Create `server/routes/bundles.js`:
- `GET /api/bundles` — `listBundles`
- `POST /api/bundles` — `saveBundle`
- `PUT /api/bundles/:name` — `saveBundle` (overwrite)
- `DELETE /api/bundles/:name` — `deleteBundle`

- [ ] **Step 7: Mount all routes in server/index.js**

```js
import orgsRouter from './routes/orgs.js';
import metadataRouter from './routes/metadata.js';
import retrieveRouter from './routes/retrieve.js';
import deployRouter from './routes/deploy.js';
import historyRouter from './routes/history.js';
import bundlesRouter from './routes/bundles.js';

app.use('/api/orgs', orgsRouter);
app.use('/api/metadata', metadataRouter);
app.use('/api/retrieve', retrieveRouter);
app.use('/api/deploy', deployRouter);
app.use('/api/history', historyRouter);
app.use('/api/bundles', bundlesRouter);
```

Also add startup prerequisites check, data directory initialization, and cleanup routines:
```js
// Run on server startup
cleanupStaleLocks(dataDir);
cleanupOldWorkspaces(30);
cleanupOldSnapshots(90, dataDir);
archiveOldRecords(dataDir, 180);
```

- [ ] **Step 8: Verify all API endpoints respond**

Run server: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit && npm run dev:server`
Test: `curl http://localhost:3000/api/health` → `{"status":"ok"}`
Test: `curl http://localhost:3000/api/orgs` → returns list (empty or from sf CLI)

- [ ] **Step 9: Commit**

```bash
git add server/routes/ server/index.js
git commit -m "feat: add all backend API routes for orgs, metadata, retrieve, deploy, history, bundles"
```

---

## Task 5: WebSocket Operation Streaming

**Files:**
- Create: `server/services/operations.js`
- Modify: `server/index.js` — integrate operations with WebSocket
- Modify: `server/routes/retrieve.js` — use operations manager
- Modify: `server/routes/deploy.js` — use operations manager

- [ ] **Step 1: Create operations manager**

Create `server/services/operations.js` — tracks all running operations (retrieve/deploy) and broadcasts progress to connected WebSocket clients.

```js
// Tracks active operations
const operations = new Map();

export function createOperation(id, type, metadata)
export function updateOperation(id, update)          // updates status, broadcasts to WS clients
export function getOperation(id)
export function getActiveOperations()
export function registerClient(ws)                    // adds WS client to broadcast list
export function unregisterClient(ws)
```

When `updateOperation` is called, it sends a JSON message to all connected WS clients:
```json
{ "event": "operation:progress", "data": { "operationId": "...", "component": "...", "status": "...", "message": "..." } }
```

- [ ] **Step 2: Integrate with WebSocket in index.js**

```js
wss.on('connection', (ws) => {
  registerClient(ws);
  // Send any active operations on connect (for tab reconnect)
  const active = getActiveOperations();
  if (active.length) ws.send(JSON.stringify({ event: 'operations:active', data: active }));
  ws.on('close', () => unregisterClient(ws));
});
```

- [ ] **Step 3: Update retrieve route to stream progress**

Modify `server/routes/retrieve.js` to use `sfCommandStream` + `updateOperation` so progress is broadcast in real-time.

- [ ] **Step 4: Update deploy route to stream progress**

Same for `server/routes/deploy.js`.

- [ ] **Step 5: Commit**

```bash
git add server/services/operations.js server/index.js server/routes/retrieve.js server/routes/deploy.js
git commit -m "feat: add WebSocket operation streaming for real-time progress"
```

---

## Task 6: Frontend — Shared Components & Composables

**Files:**
- Create: `client/src/components/WizardStepper.vue`
- Create: `client/src/components/ProgressTracker.vue`
- Create: `client/src/components/OrgCard.vue`
- Create: `client/src/components/OrgDropdown.vue`
- Create: `client/src/components/ConnectOrgModal.vue`
- Create: `client/src/components/ConfirmModal.vue`
- Create: `client/src/composables/useWebSocket.js`
- Create: `client/src/composables/useOrgs.js`
- Create: `client/src/composables/useApi.js`

- [ ] **Step 1: Create useApi composable**

Create `client/src/composables/useApi.js` — thin wrapper around `fetch` for API calls. Handles errors, JSON parsing.

```js
export function useApi() {
  async function get(url) { ... }
  async function post(url, body) { ... }
  async function put(url, body) { ... }
  async function del(url) { ... }
  return { get, post, put, del }
}
```

- [ ] **Step 2: Create useWebSocket composable**

Create `client/src/composables/useWebSocket.js` — connects to `ws://localhost:{port}`, auto-reconnects, exposes reactive `messages` ref. Parses incoming JSON and emits to event listeners.

```js
export function useWebSocket() {
  function on(event, callback) { ... }
  function off(event, callback) { ... }
  const connected = ref(false)
  return { on, off, connected }
}
```

- [ ] **Step 3: Create useOrgs composable**

Create `client/src/composables/useOrgs.js` — fetches orgs from API, provides reactive `orgs` list, `loading` state, `refresh()`, `connectOrg()`, `removeOrg()`.

- [ ] **Step 4: Create WizardStepper component**

Create `client/src/components/WizardStepper.vue`:
- Props: `steps` (array of `{ label }`) and `currentStep` (number)
- Renders the numbered step circles with connecting lines
- Completed steps show green checkmark, current step shows indigo, future steps show grey
- Matches the dark theme from the mockups

- [ ] **Step 5: Create OrgCard component**

Create `client/src/components/OrgCard.vue`:
- Props: `org` object with `alias, username, type, status, lastUsed`
- Renders card with name, username, type badge (red for Production, blue for Sandbox), status dot, actions
- Production orgs get red/orange border

- [ ] **Step 6: Create OrgDropdown component**

Create `client/src/components/OrgDropdown.vue`:
- Props: `modelValue`, `orgs`, `label`
- Dropdown selector for orgs with status dots and type badges
- Expired orgs shown greyed out with "Reconnect" link
- Production orgs show warning badge

- [ ] **Step 7: Create ConnectOrgModal component**

Create `client/src/components/ConnectOrgModal.vue`:
- Two-option selector: Production / Sandbox
- Friendly name input
- "Log in to Salesforce" button with helper text
- After clicking "Log in", starts polling `GET /api/orgs/:alias/health` every 2 seconds
- Shows spinner with "Waiting for Salesforce login..." during polling
- Success state when health check returns `connected` → emits `connected` event
- Timeout after 120 seconds → shows "Authentication timed out. Try again."

- [ ] **Step 8: Create ProgressTracker component**

Create `client/src/components/ProgressTracker.vue`:
- Props: `operationId`
- Listens to WebSocket for `operation:progress` events matching the ID
- Shows overall progress bar + per-component status rows (spinner/check/x/circle)
- Step counter: "Deploying component 3 of 12..."
- Collapsible "Show Details" raw log panel at bottom
- Handles success/error/partial-failure end states

- [ ] **Step 9: Create ConfirmModal component**

Create `client/src/components/ConfirmModal.vue`:
- Generic confirmation dialog
- Props: `title, message, confirmText, cancelText, dangerous, requireTypedConfirmation, confirmationText`
- If `requireTypedConfirmation` is true, shows text input that must match `confirmationText`
- Used for deploy confirmation and production safeguards

- [ ] **Step 10: Commit**

```bash
git add client/src/components/ client/src/composables/
git commit -m "feat: add shared components (WizardStepper, OrgCard, ProgressTracker, modals) and composables"
```

---

## Task 7: Frontend — Orgs Page

**Files:**
- Modify: `client/src/views/OrgsPage.vue`

- [ ] **Step 1: Implement OrgsPage with empty state**

When no orgs are connected, show the welcome screen:
- "Welcome to SF Deploy Manager"
- "To get started, connect your first Salesforce org."
- "You'll log in through Salesforce — we never see your password."
- Big "+ Connect a Salesforce Org" button

- [ ] **Step 2: Implement connected orgs list**

When orgs exist, show:
- Header: "Connected Orgs" with "+ Connect Org" button
- Grid of OrgCard components
- Health status dots (green/yellow/red) from API
- Refresh, Reconnect, Remove actions on each card

- [ ] **Step 3: Wire up ConnectOrgModal**

"+ Connect Org" button opens the modal. On success, refresh the orgs list.

- [ ] **Step 4: Add "connect second org" prompt**

After connecting the first org, show: "To move metadata between orgs, you'll need at least two connected. Connect another?"

- [ ] **Step 5: Verify orgs page works end-to-end**

Run dev, navigate to Orgs page. If `sf` CLI is authenticated, orgs should appear. Test connect flow (opens browser for OAuth).

- [ ] **Step 6: Commit**

```bash
git add client/src/views/OrgsPage.vue
git commit -m "feat: implement Orgs page with connect flow, health checks, and empty state"
```

---

## Task 8: Frontend — Metadata Tree Component

**Files:**
- Create: `client/src/components/MetadataTree.vue`
- Create: `client/src/composables/useMetadata.js`

- [ ] **Step 1: Create useMetadata composable**

Create `client/src/composables/useMetadata.js`:
- `loadMetadata(orgAlias)` — fetches types from API, then **progressively** loads components per type (shows categories as they load, not all at once). This avoids a 30-60 second wait for large orgs. Categories appear with spinners that resolve as each type loads.
- `search(query)` — filters components across all categories, debounced 300ms
- `toggleRecentlyModified()` — filters to last 7 days
- Reactive state: `categories`, `loading`, `searchQuery`, `recentOnly`
- **Note:** `sf org list metadata` does not return `lastModifiedBy` — only the component fullName and type. The "last modified" display will show the date if available from the metadata, or be omitted. This is a known limitation.

- [ ] **Step 2: Create MetadataTree component**

Create `client/src/components/MetadataTree.vue`:
- Props: `orgAlias`, `modelValue` (selected components array)
- Search bar at top
- "Recently Modified" toggle
- Expandable category sections with count badges
- Each component row: checkbox, friendly name, API name (muted), last modified info
- Persistent bottom bar: "{N} components selected" with expandable list
- "Save as Bundle" / "Load Bundle" dropdown in bottom bar
- Emits `update:modelValue` on selection change

- [ ] **Step 3: Add bundle save/load to MetadataTree**

- "Save as Bundle" opens a name input → calls `POST /api/bundles`
- "Load Bundle" dropdown fetches from `GET /api/bundles`, selecting one pre-checks those components
- Bundles listed with delete option

- [ ] **Step 4: Verify metadata tree works**

Run dev, render MetadataTree with a connected org alias. Categories should load, search should filter, selection should work.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/MetadataTree.vue client/src/composables/useMetadata.js
git commit -m "feat: implement searchable MetadataTree with categories, search, and bundle support"
```

---

## Task 9: Frontend — Retrieve Page (Wizard)

**Files:**
- Modify: `client/src/views/RetrievePage.vue`

- [ ] **Step 1: Implement wizard shell with 4 steps**

RetrievePage uses WizardStepper with steps: Source Org, Select Components, Review, Retrieve.
Navigation via Next/Back buttons. Step state managed locally.

- [ ] **Step 2: Implement Step 1 — Source Org**

OrgDropdown to select source org. "Next" button enabled only when org is selected. Pre-flight auth check on selection.

- [ ] **Step 3: Implement Step 2 — Select Components**

Toggle between "All Changes" / "Cherry Pick" modes.
Cherry Pick mode renders MetadataTree for the selected org.
All Changes mode shows a warning for large orgs.

- [ ] **Step 4: Implement Step 3 — Review**

Summary card: source org, component count, list of selected components. "Start Retrieve" button.

- [ ] **Step 5: Implement Step 4 — Progress**

Calls `POST /api/retrieve` with selected components. Renders ProgressTracker with the returned operation ID.
On success: "Deploy These" button (navigates to Deploy with components pre-selected) or "Done".
On error: shows translated error with retry option.

- [ ] **Step 6: Verify full retrieve wizard flow**

Run dev, go through all 4 steps. Verify progress streams in real-time via WebSocket.

- [ ] **Step 7: Commit**

```bash
git add client/src/views/RetrievePage.vue
git commit -m "feat: implement Retrieve wizard with source selection, metadata tree, and progress tracking"
```

---

## Task 10: Frontend — Deploy Page (Wizard)

**Files:**
- Modify: `client/src/views/DeployPage.vue`

- [ ] **Step 1: Implement wizard shell with 5 steps**

DeployPage uses WizardStepper with steps: Source, Select Components, Target Org, Validate, Deploy.

- [ ] **Step 2: Implement Step 1 — Source**

Two options:
- "From a previous retrieve" — shows list of recent workspaces from `GET /api/retrieve` filtered by user
- "From an org" — shows OrgDropdown to start inline retrieve

- [ ] **Step 3: Implement Step 2 — Select Components**

If from previous retrieve: shows pre-selected components with option to deselect.
If from org: renders MetadataTree.
Bundle support via MetadataTree's built-in bundle UI.

- [ ] **Step 4: Implement Step 3 — Target Org**

OrgDropdown for target org. Production orgs show red/orange badge.
Auth health check on selection — if expired, show reconnect prompt.

- [ ] **Step 5: Implement Step 4 — Validate (Dry Run)**

Calls `POST /api/deploy/validate`. Shows per-component results.
Green banner if all pass → enables "Deploy Now" button.
Red banner if any fail → shows errors, option to re-validate or go back.
This step is mandatory — cannot skip.

- [ ] **Step 6: Implement Step 5 — Deploy**

"Deploy Now" opens ConfirmModal:
- Shows target org, component count and list
- Production orgs require typing org name to confirm

On confirm:
- Calls `POST /api/deploy`
- Renders ProgressTracker
- On success: "Deploy More" / "View History" buttons
- On partial failure: "Retry Failed Only" / "Rollback All" buttons
- On complete failure: translated error, "Rollback" button

- [ ] **Step 7: Wire up lock warning**

Before deploying, check for existing lock. If found, show warning: "{User} is currently deploying to this org (started {time} ago). Wait or proceed anyway?"

- [ ] **Step 8: Verify full deploy wizard flow**

Run dev, go through all 5 steps including validation. Verify progress streams, error handling works.

- [ ] **Step 9: Commit**

```bash
git add client/src/views/DeployPage.vue
git commit -m "feat: implement Deploy wizard with validation, progress tracking, and safety features"
```

---

## Task 11: Frontend — History Page

**Files:**
- Modify: `client/src/views/HistoryPage.vue`

- [ ] **Step 1: Implement filter bar**

Top bar with:
- Person dropdown (populated from history data)
- Org dropdown (populated from history data)
- Status toggle: All / Passed / Failed
- Date range selector: 7d / 30d / 90d / Custom

All filters call `GET /api/history` with query params.

- [ ] **Step 2: Implement history table**

Columns: Status icon, User, Operation (Retrieve/Deploy), Components (count + expandable), Source → Target, Date (relative + absolute tooltip), Duration, Actions.
Sorted newest first. Default: last 30 days.

- [ ] **Step 3: Implement row expansion and actions**

- Click row to expand → shows full component list and error details
- "Rollback" button on deploy entries → calls `POST /api/deploy/:id/rollback` with ConfirmModal
- Production deploys highlighted with subtle red/orange indicator

- [ ] **Step 4: Handle empty state**

When no history exists: "No deployments yet. Use the Retrieve or Deploy pages to get started."

- [ ] **Step 5: Verify history page works**

After performing a retrieve/deploy, the history page should show the entry with correct data.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/HistoryPage.vue
git commit -m "feat: implement History page with filters, rollback, and shared team view"
```

---

## Task 12: Launcher Scripts & Production Build

**Files:**
- Create: `Start SF Deploy.command`
- Create: `Start SF Deploy.bat`
- Modify: `package.json` — add build script
- Modify: `server/index.js` — serve built client

- [ ] **Step 1: Create macOS launcher**

Create `Start SF Deploy.command`:
```bash
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
# Server opens the browser itself via the `open` npm package once it's listening
node server/index.js
# Note: Do NOT open the browser from the launcher — the server handles this to avoid race conditions
```

Run: `chmod +x "Start SF Deploy.command"`

- [ ] **Step 2: Create Windows launcher**

Create `Start SF Deploy.bat`:
```batch
@echo off
cd /d "%~dp0"
where sf >nul 2>nul || (echo Salesforce CLI not found. Install: npm install @salesforce/cli -g & pause & exit)
where node >nul 2>nul || (echo Node.js not found. Install from https://nodejs.org & pause & exit)
if not exist node_modules npm install
if not exist server\node_modules (cd server && npm install && cd ..)
if not exist client\dist npm run build
:: Server opens the browser itself via the `open` npm package once it's listening
node server/index.js
```

- [ ] **Step 3: Ensure server serves built client correctly**

The Express server already serves `client/dist/` as static files and has the SPA fallback. Verify:

Run: `npm run build && npm start`
Expected: App opens in browser at localhost:3000 with full UI working.

- [ ] **Step 4: Create data directories on first run**

Add to `server/index.js` startup:
```js
import fs from 'fs';
const dataDir = path.join(__dirname, '../data');
['history', 'bundles', 'rollbacks'].forEach(dir => {
  fs.mkdirSync(path.join(dataDir, dir), { recursive: true });
});
```

- [ ] **Step 5: Add .gitignore entries**

Add to `.gitignore`:
```
node_modules/
client/dist/
data/history/
data/rollbacks/
workspaces/
.superpowers/
```

- [ ] **Step 6: Verify full production flow**

Double-click `Start SF Deploy.command`. Browser should open, app should work fully — org management, retrieve, deploy, history.

- [ ] **Step 7: Commit**

```bash
git add "Start SF Deploy.command" "Start SF Deploy.bat" .gitignore package.json server/index.js
git commit -m "feat: add one-click launcher scripts and production build configuration"
```

---

## Task 13: Polish & Final Integration

**Files:**
- Modify: Various client components for UI polish
- Create: `client/src/components/PrerequisiteError.vue`

- [ ] **Step 1: Add prerequisite check screen**

Create `client/src/components/PrerequisiteError.vue` — shown when the server health check returns failures. Shows which checks failed with install instructions.

Add `GET /api/prerequisites` endpoint that returns check results. App.vue checks this on mount and shows PrerequisiteError if needed.

- [ ] **Step 2: Add sidebar responsive collapse**

Sidebar collapses to icons-only below 1200px viewport width. CSS media query.

- [ ] **Step 3: Add loading states everywhere**

Ensure all API calls show loading spinners (skeleton screens for lists, spinner for buttons).

- [ ] **Step 4: Add toast notifications**

Create a simple toast component for success/error notifications after operations complete.

- [ ] **Step 5: Final visual polish pass**

Review all pages against the mockups from the brainstorming session. Ensure:
- Dark theme colors are correct
- Border radius consistent (8px cards, 6px buttons)
- Typography hierarchy (headings, body, muted text)
- Production org badges are visible everywhere
- Wizard stepper animation on step transitions

- [ ] **Step 6: End-to-end test of all user flows**

Test manually:
1. First launch empty state → connect org → second org prompt
2. Retrieve wizard: select org → cherry-pick components → review → retrieve with progress
3. Deploy wizard: from previous retrieve → select target → validate → confirm → deploy with progress
4. History: verify entries appear, filters work, rollback works
5. Error handling: test with invalid org alias → verify translated error appears

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: add prerequisite checks, loading states, toasts, and UI polish"
```

---

## Summary

| Task | Description | Depends On |
|---|---|---|
| 1 | Project scaffolding | — |
| 2 | SF CLI wrapper service | 1 |
| 3 | Workspace & history services | 1 |
| 4 | Backend API routes | 2, 3 |
| 5 | WebSocket streaming | 4 |
| 6 | Shared frontend components | 1 |
| 7 | Orgs page | 4, 6 |
| 8 | Metadata tree | 4, 6 |
| 9 | Retrieve wizard | 5, 7, 8 |
| 10 | Deploy wizard | 5, 7, 8 |
| 11 | History page | 4, 6 |
| 12 | Launcher scripts & build | 7-11 |
| 13 | Polish & integration | 7-12 |

**Parallelizable:** Tasks 2+3 can run in parallel. Tasks 6+4 can run in parallel. Tasks 7+8+11 can run in parallel. Tasks 9+10 can run in parallel.
