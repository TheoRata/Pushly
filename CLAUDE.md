# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Pushly — a local web UI wrapping the Salesforce CLI. Lets CLI-shy Salesforce admins retrieve and deploy metadata between orgs via guided wizard flows. Distributed via shared folder (SharePoint/OneDrive), runs locally on each user's machine.

## Commands

```bash
# Development (runs Express server + Vite dev server concurrently)
npm run dev

# Production build (builds Vue client to client/dist/)
npm run build

# Start production server (serves built client + API)
npm start

# Run all tests
npm test

# Run a single test file
cd server && npx vitest run tests/history.test.js

# Run tests in watch mode
cd server && npx vitest
```

After changing frontend code, you must `npm run build` if testing via the production server (port 3000). The Vite dev server (port 5173) hot-reloads automatically.

## Architecture

**Monorepo with two packages:**
- `server/` — Node.js + Express backend (ES modules, `"type": "module"`)
- `client/` — Vue 3 + Vite + Tailwind CSS v4 frontend

**Data flow:** Browser → REST API + WebSocket → Express server → spawns `sf` CLI commands → Salesforce orgs

### Backend (`server/`)

- **`index.js`** — Express app, WebSocket server, port detection (3000-3010), browser auto-open, data dir init, startup cleanup
- **`routes/`** — 6 Express Router modules: orgs, metadata, retrieve, deploy, history, bundles
- **`services/`** — Business logic:
  - `sf-cli.js` — Core CLI wrapper. `sfCommand()` runs with `--json`, parses output. `sfCommandStream()` streams stdout line-by-line for real-time progress.
  - `operations.js` — Tracks active operations in a Map, broadcasts progress to all WebSocket clients
  - `history.js` — Each operation writes one JSON file to `data/history/`. Individual files avoid OneDrive/SharePoint sync conflicts. Reader tolerates corrupt/partial files.
  - `lock.js` — Deploy locks via `data/{orgAlias}.deploy.lock` files. Best-effort on network drives (sync delay acknowledged).
  - `workspace.js` — Creates per-user `workspaces/{user}/{org}-{timestamp}/` dirs with auto-generated `sfdx-project.json`
  - `rollback.js` — Pre-deploy snapshots in `data/rollbacks/{deployId}/`
- **`utils/error-translator.js`** — Maps 8 common Salesforce error codes to plain-English explanations with remediation actions. Unknown errors pass through raw.

### Frontend (`client/src/`)

- **Views (4 pages):** OrgsPage, RetrievePage (4-step wizard), DeployPage (5-step wizard), HistoryPage
- **Composables:** `useApi` (fetch wrapper), `useWebSocket` (singleton connection, auto-reconnect), `useOrgs` (shared reactive state), `useMetadata` (progressive loading per category), `useToast`
- **Key components:** `MetadataTree` (searchable categorized component browser with bundle support), `ProgressTracker` (WebSocket-driven per-component status), `WizardStepper` (reusable step indicator)

### Key Patterns

- `filteredCategories` in `useMetadata` is a computed that creates new objects — mutable state like `expanded` must be tracked separately (see MetadataTree's `expandedCategories` Set)
- `useOrgs` and `useWebSocket` use module-level shared state (singleton pattern) so all consuming components see the same data
- The `sf org list --json` response has `{ other, nonScratchOrgs, scratchOrgs, sandboxes }` — all must be merged and deduplicated
- API responses are wrapped (e.g., `{ orgs: [...] }`) — composables must extract the inner array
- Deploy wizard step 4 (Validate) is mandatory — cannot skip to deploy

## Theme

Dark developer theme. CSS variables defined in `client/src/assets/main.css`:
- Background: `--bg-base: #0f0f1a`, `--bg-primary: #1e1e2e`, `--bg-surface: #252536`
- Accents: `--color-primary: #6366f1` (indigo), `--color-secondary: #a855f7` (purple)
- Status: `--color-success: #4ade80`, `--color-error: #f87171`, `--color-warning: #fbbf24`

## Prerequisites

- Node.js >= 18
- Salesforce CLI (`sf`) installed and on PATH
- Server checks these at startup via `utils/prerequisites.js`

## Testing

Vitest with ES modules. Tests use temp directories (`fs.mkdtempSync`). The `sf-cli.test.js` tests gracefully skip if `sf` CLI is not installed.

## Gotchas

- `sf org list --json` returns `{ other, nonScratchOrgs, scratchOrgs, sandboxes }` — merge all and deduplicate by `orgId`. The `other` array often has the most complete data.
- Backend API responses are wrapped objects (e.g., `{ orgs: [...] }`, `{ types: {...} }`) — composables must extract the inner data, not assign the wrapper directly.
- Org fields from SF CLI need normalization: `connectedStatus: 'Connected'` → `status: 'connected'`, `isSandbox: true` → `type: 'sandbox'`. Done in `routes/orgs.js`.
- Never set mutable state on objects from Vue `computed()` — they're recreated each evaluation. Track UI state (expanded, selected) in separate `ref()` or `reactive()`.
- After frontend changes, `npm run build` is required if testing via production server (`npm start`). The Vite dev server (`npm run dev`) hot-reloads but runs on a different port.
- Port 3000 may be occupied by other local apps. The server auto-detects (3000-3010) but the user may see a different app if they navigate to 3000 manually.
- Users who authenticated via VS Code Salesforce Extension already have orgs in `sf org list` — the app should show these automatically, no re-auth needed.
