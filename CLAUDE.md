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
- **`routes/`** — 7 Express Router modules: orgs, metadata, retrieve, deploy, history, bundles, compare
- **`services/`** — Business logic:
  - `sf-cli.js` — Core CLI wrapper. `sfCommand()` runs with `--json`, parses output. `sfCommandStream()` streams stdout line-by-line for real-time progress.
  - `operations.js` — Tracks active operations in a Map, broadcasts progress to all WebSocket clients
  - `history.js` — Each operation writes one JSON file to `data/history/`. Individual files avoid OneDrive/SharePoint sync conflicts. Reader tolerates corrupt/partial files.
  - `lock.js` — Deploy locks via `data/{orgAlias}.deploy.lock` files. Best-effort on network drives (sync delay acknowledged).
  - `workspace.js` — Creates per-user `workspaces/{user}/{org}-{timestamp}/` dirs with auto-generated `sfdx-project.json`
  - `rollback.js` — Pre-deploy snapshots in `data/rollbacks/{deployId}/`
  - `compare.js` — `diffInventories()` diffs metadata lists, `extractProperties()` extracts type-specific properties from XML, `getComponentDetail()` retrieves single component from both orgs for drill-down
- **`utils/error-translator.js`** — Maps 8 common Salesforce error codes to plain-English explanations with remediation actions. Unknown errors pass through raw.

### Frontend (`client/src/`)

- **Views (6 pages):** DashboardPage (stats + recent activity), OrgsPage, RetrievePage (4-step wizard), ComparePage (side-by-side org diff), DeployPage (5-step wizard), HistoryPage (paginated)
- **Composables:** `useApi` (fetch wrapper), `useWebSocket` (singleton connection, auto-reconnect), `useOrgs` (shared reactive state), `useMetadata` (progressive loading, refresh with cache bypass), `useCompare` (org comparison state, filtering, selection), `usePagination` (numbered page logic), `useToast`
- **Glass design system** (`components/glass/`): 13 reusable components — GlassCard, GlassButton, GlassInput, GlassBadge, GlassToggle, GlassModal, GlassDropdown, GlassCombobox, GlassTable, GlassPillStepper, GlassPagination, GlassHoverButton, GlassSpotlightCard
- **Key components:** `TopNavBar` (fixed top nav with SpecialText brand), `MetadataTree` (searchable categorized component browser with bundle support, refresh all/open), `ProgressTracker` (WebSocket-driven per-component status), `OrgDropdown` (searchable combobox with exclude prop)

### Key Patterns

- `filteredCategories` in `useMetadata` is a computed that creates new objects — mutable state like `expanded` must be tracked separately (see MetadataTree's `expandedCategories` Set)
- `useOrgs` and `useWebSocket` use module-level shared state (singleton pattern) so all consuming components see the same data
- The `sf org list --json` response has `{ other, nonScratchOrgs, scratchOrgs, sandboxes }` — all must be merged and deduplicated
- API responses are wrapped (e.g., `{ orgs: [...] }`) — composables must extract the inner array
- Deploy wizard step 4 (Validate) is mandatory — cannot skip to deploy
- Deploy wizard accepts `fromCompare` query params (`?fromCompare=true&source=X&target=Y&components=Type:Name,...`) — sets `sourceType='org'` and skips to validate step. The validation triggers a retrieve before validating.
- Metadata batch-components endpoint caches results on disk. Pass `{ skipCache: true }` in POST body to force fresh retrieval from SF CLI.
- `OrgDropdown` accepts an `exclude` prop to prevent selecting the same org as source and target in DeployPage.

## Theme

Blue theme with light/dark mode support. `<html class="dark">` defaults to dark mode. CSS variables in `client/src/assets/main.css`:
- Light: `--background: #ffffff`, `--primary: #3b82f6`, `--foreground: #333333`
- Dark: `--background: #171717`, `--primary: #3b82f6`, `--foreground: #e5e5e5`
- Glass system: `--glass-bg`, `--glass-border`, `--glass-blur` adapt per mode
- Status: `--color-success: #4ade80`, `--color-error: #ef4444`, `--color-warning: #fbbf24`
- `@theme inline` block registers all tokens with Tailwind CSS v4

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
- **Server has no hot-reload.** After changing backend code (`server/`), you must restart the server. The Vite dev server only hot-reloads frontend code.
- **Agent teams enabled.** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` is set in global settings. Use teams for parallel backend/frontend work on separate file sets.
- **Restart server after backend edits.** `pkill -f 'node.*--watch.*index.js'` then `npm run dev` in background. This is easy to forget when using agent teams — teammates editing server/ files need the server restarted manually.
