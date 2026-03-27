# SF Deploy Manager — Design Specification

**Date:** 2026-03-24
**Status:** Reviewed
**Author:** Theodor + Claude

---

## 1. Problem Statement

A Salesforce team of 5-8 admins and developers needs to move metadata (Flows, Custom Fields, Permission Sets, etc.) between Salesforce orgs. They understand Salesforce concepts but are uncomfortable with the terminal and CLI commands. They have no GitHub, no CI/CD pipeline, and share files via SharePoint/OneDrive.

They need a friendly UI that runs the Salesforce CLI behind the scenes, guiding them through retrieval and deployment step by step.

## 2. Users

- **5-8 Salesforce admins and developers**
- They know Salesforce well: metadata types, orgs, sandboxes, flows, fields, permission sets
- They do NOT know CLI commands and are intimidated by the terminal
- They make changes in sandboxes (clicks in Setup) and need to move those changes to staging or production orgs
- Non-technical business analysts on the team will NOT use this tool

## 3. Architecture

### 3.1 High-Level Overview

```
┌──────────────────────────────────────────────┐
│  One-Click Launcher (.command / .bat)         │
│  → Checks prerequisites                      │
│  → Installs npm deps if needed               │
│  → Starts Express server                     │
│  → Opens browser to localhost                 │
│  → Minimizes terminal window                 │
└──────────────┬───────────────────────────────┘
               │
┌──────────────▼───────────────────────────────┐
│  Frontend (Browser @ localhost:3000)           │
│  Vue 3 + Vite + Tailwind CSS                  │
│  - Dark theme with purple/indigo accents      │
│  - Icon sidebar (with labels) + wizard flows  │
│  - WebSocket connection for real-time updates  │
└──────────────┬───────────────────────────────┘
               │ HTTP REST + WebSocket
┌──────────────▼───────────────────────────────┐
│  Backend (Node.js + Express)                  │
│  - REST API endpoints for all operations      │
│  - WebSocket server for streaming CLI output   │
│  - Spawns `sf` CLI via child_process           │
│  - Reads/writes shared JSONL history file      │
│  - Manages deploy locks and rollback snapshots │
└──────────────┬───────────────────────────────┘
               │ spawns
┌──────────────▼───────────────────────────────┐
│  Salesforce CLI (sf)                          │
│  - org login web / display / list             │
│  - project retrieve start / deploy start      │
│  - org list metadata-types / list metadata    │
└──────────────────────────────────────────────┘
```

### 3.2 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Vue 3 + Vite + Tailwind CSS | Theodor already uses Vue/Nuxt. Tailwind makes dark theme trivial. |
| Backend | Node.js + Express | Simplest server for wrapping CLI commands. |
| Real-time | WebSocket (ws) | Stream CLI output to browser in real-time. |
| History | Individual JSON files in shared `data/history/` directory | Each deploy writes one file (`{id}.json`). Avoids append conflicts and OneDrive sync issues. The app assembles the list at read time by scanning the directory. |
| Distribution | Shared folder (SharePoint/OneDrive) | No server infrastructure needed. |
| Launcher | `.command` (macOS) / `.bat` (Windows) | One double-click to start. |

### 3.3 Directory Structure

```
shared-drive/
└── sf-deploy-manager/
    ├── Start SF Deploy.command          # macOS launcher
    ├── Start SF Deploy.bat              # Windows launcher
    ├── package.json
    ├── server/
    │   ├── index.js                     # Express + WebSocket server
    │   ├── routes/
    │   │   ├── orgs.js                  # Org management endpoints
    │   │   ├── metadata.js              # Metadata browsing endpoints
    │   │   ├── retrieve.js              # Retrieve operations
    │   │   ├── deploy.js                # Deploy operations
    │   │   └── history.js               # History read endpoints
    │   ├── services/
    │   │   ├── sf-cli.js                # Salesforce CLI wrapper
    │   │   ├── history.js               # JSONL read/write
    │   │   ├── lock.js                  # Deploy lock management
    │   │   └── rollback.js              # Pre-deploy snapshot management
    │   └── utils/
    │       ├── error-translator.js      # Common SF error → plain English
    │       └── prerequisites.js         # Startup checks (sf CLI, Node version)
    ├── client/
    │   ├── src/
    │   │   ├── App.vue
    │   │   ├── router/
    │   │   ├── views/
    │   │   │   ├── OrgsPage.vue         # Org management + connect flow
    │   │   │   ├── RetrievePage.vue     # Retrieve wizard
    │   │   │   ├── DeployPage.vue       # Deploy wizard
    │   │   │   └── HistoryPage.vue      # Shared deployment history
    │   │   ├── components/
    │   │   │   ├── Sidebar.vue          # Icon + label sidebar
    │   │   │   ├── WizardStepper.vue    # Reusable wizard step indicator
    │   │   │   ├── MetadataTree.vue     # Searchable metadata tree
    │   │   │   ├── ProgressTracker.vue  # Component-level deploy progress
    │   │   │   ├── OrgCard.vue          # Single org display with status
    │   │   │   ├── ConnectOrgModal.vue  # Connect new org flow
    │   │   │   └── ConfirmDeploy.vue    # Pre-deploy confirmation modal
    │   │   └── composables/
    │   │       ├── useWebSocket.js      # WebSocket connection management
    │   │       ├── useOrgs.js           # Org state management
    │   │       └── useMetadata.js       # Metadata tree state + caching
    │   └── tailwind.config.js
    ├── workspaces/                      # Per-user retrieve/deploy workspaces
    │   └── {username}/
    │       └── {orgAlias}-{timestamp}/
    └── data/
        ├── history/                     # One JSON file per operation (shared)
        ├── bundles/                     # Saved component selection templates
        └── rollbacks/                   # Pre-deploy snapshots for undo
```

### 3.4 Workspace Management

Each retrieve/deploy operation uses a managed workspace. Users never see or interact with `sfdx-project.json` files.

```
sf-deploy-manager/
└── workspaces/
    └── {username}/
        └── {orgAlias}-{timestamp}/
            ├── sfdx-project.json        # Auto-generated
            └── force-app/
                └── main/default/...     # Retrieved metadata
```

The backend auto-generates `sfdx-project.json` and manages the workspace lifecycle. Old workspaces are cleaned up after 30 days.

## 4. Pages & User Flows

### 4.1 Sidebar Navigation

Icon sidebar with text labels. Four pages:

| Icon | Label | Description |
|---|---|---|
| Globe | **Orgs** | Manage connected Salesforce orgs |
| Download | **Retrieve** | Pull metadata from an org (wizard) |
| Upload | **Deploy** | Push metadata to an org (wizard) |
| Clock | **History** | Shared team deployment log |

The sidebar is always visible. Active page is highlighted with the primary indigo color.

### 4.2 Orgs Page (Home)

The default landing page. Shows all connected orgs with health status.

**Org list:**
Each org displayed as a card showing:
- Org friendly name (alias)
- Salesforce username
- Org type badge: `Production` (red/orange badge) / `Sandbox` (blue badge)
- Connection status: green dot (connected), yellow dot (token expiring), red dot (expired)
- Last used timestamp
- Actions: Refresh, Reconnect, Remove

**Health check:** On page load, the backend runs `sf org display --target-org {alias}` for each org and reports status. Expired tokens show a prominent "Reconnect" button.

**Connect Org flow** (triggered by "+ Connect Org" button):

1. **Modal opens** with two options:
   - "Production Org" — uses `login.salesforce.com`
   - "Sandbox" — uses `test.salesforce.com`
2. User enters a **friendly name** (e.g., "Staging Sandbox", "Production")
3. User clicks **"Log in to Salesforce"**
   - Helper text: "You'll be redirected to Salesforce to log in. This app will be granted permission to read and deploy metadata on your behalf."
4. Browser opens Salesforce OAuth login page (via `sf org login web`)
5. User authenticates in Salesforce
6. Redirect completes, modal shows success
7. Org appears in the list with green status

**Production org safeguards:** Any org tagged as Production gets:
- A distinct red/orange border on its card
- A warning badge visible everywhere the org appears in dropdowns
- An extra confirmation step when selected as a deploy target

**Empty state (first launch):**
```
Welcome to SF Deploy Manager

To get started, connect your first Salesforce org.
You'll log in through Salesforce — we never see your password.

[ Connect a Salesforce Org ]
```

After connecting one org, prompt to connect a second: "To move metadata between orgs, you'll need at least two connected."

### 4.3 Retrieve Page (Wizard)

Four-step wizard: **Source Org → Select Components → Review → Retrieve**

**Step 1 — Source Org:**
- Dropdown of all connected orgs (with status indicators)
- If any org has expired auth, show it greyed out with "Reconnect" link
- "Next" button enabled only when an org is selected

**Step 2 — Select Components:**
- Two mode toggle buttons: **"All Changes"** / **"Cherry Pick"**
- **Cherry Pick mode** shows the searchable metadata tree (see §5)
- **All Changes mode** retrieves everything — shows a warning for large orgs
- Persistent bottom bar: "14 components selected" with expandable list
- Back button always visible

**Step 3 — Review:**
- Summary of what will be retrieved: component count, list of items, source org
- "Start Retrieve" button

**Step 4 — Retrieve (Progress):**
- Component-level progress tracker (see §6)
- On success: "Retrieved 14 components from [Org]" with option to "Deploy These" (jumps to Deploy wizard with components pre-selected) or "Done"
- On error: error detail with plain-English explanation

### 4.4 Deploy Page (Wizard)

Five-step wizard: **Source → Select Components → Target Org → Validate → Deploy**

**Step 1 — Source:**
- Option A: "From a previous retrieve" — shows recent retrieves to pick from
- Option B: "From an org" — starts an inline retrieve flow (pick org, pick components)

**Step 2 — Select Components:**
- If coming from a previous retrieve, shows those components pre-selected with option to deselect
- If coming from an org, shows the metadata tree (same as Retrieve Step 2)
- Supports saved bundles (see §7)

**Step 3 — Target Org:**
- Dropdown of connected orgs
- Production orgs shown with red/orange warning badge
- Auth health check runs when org is selected — if expired, prompt reconnect before proceeding
- "Next" button validates the connection before proceeding

**Step 4 — Validate (Dry Run):**
- Runs `sf project deploy start --dry-run --target-org {alias}`
- Shows results per component: would succeed / would fail
- If all pass: green banner "Validation passed. Safe to deploy." with "Deploy Now" button
- If any fail: red banner with error details. User can fix and re-validate, or go back to adjust selection
- This step is **mandatory** — users cannot skip to deploy without validating first

**Step 5 — Deploy:**
- **Pre-deploy confirmation modal:**
  - Target org name (with production warning if applicable)
  - Component count and list
  - "This action will modify [Org Name]. This cannot be undone automatically."
  - For production orgs: additional text input "Type the org name to confirm"
  - "Deploy" / "Cancel" buttons
- **Auto-rollback snapshot:** Before deploying, backend automatically retrieves current versions of the same components from the target org and stores in `data/rollbacks/{deployId}/`
- **Deploy lock:** Backend writes `{orgAlias}.deploy.lock` to the shared folder. If a lock exists, shows: "Sarah is currently deploying to this org (started 3 min ago). Wait or proceed anyway?"
- **Progress tracker** (see §6)
- On success: summary, "Deploy More" / "View History" buttons
- On partial failure: shows succeeded vs failed components, error details, "Retry Failed Only" button
- On complete failure: error details with plain-English translation, "Rollback" button (deploys the pre-saved snapshot)

### 4.5 History Page

Displays the shared JSONL deployment log with filters.

**Filters (top bar):**
- **By person:** Dropdown of all usernames in the history
- **By org:** Dropdown of all target orgs in the history
- **By status:** All / Passed / Failed
- **By date range:** Last 7 days / 30 days / 90 days / Custom range

**Table columns:**
| Column | Content |
|---|---|
| Status | Green checkmark / Red X icon |
| User | Who deployed |
| Operation | Retrieve / Deploy |
| Components | Count + expandable list |
| Source → Target | Org names with arrow |
| Date | Relative time ("2 hours ago") with absolute on hover |
| Duration | How long it took |
| Actions | View Details / Rollback (for deploys) |

**Default view:** Last 30 days, all users, all statuses. Sorted newest first.

**History record format** (one JSON file per operation in `data/history/`):

Filename: `{id}.json` (e.g., `deploy-1711300000-abc.json`)

```json
{
  "id": "deploy-1711300000-abc",
  "type": "deploy",
  "user": "john.smith",
  "sourceOrg": "Dev Sandbox",
  "targetOrg": "Production",
  "components": [
    "Flow:Lead_Assignment_Flow",
    "CustomField:Account.Industry__c",
    "PermissionSet:Sales_Team_Access"
  ],
  "componentCount": 3,
  "status": "success",
  "errors": [],
  "startedAt": "2026-03-24T14:30:00Z",
  "completedAt": "2026-03-24T14:30:24Z",
  "duration": 24,
  "rollbackId": "rollback-1711300000-abc"
}
```

**Username resolution:** The `user` field is populated from `os.userInfo().username` on the machine running the app. If multiple people share an OS account, the app prompts for a name on first launch and stores it locally.

**Auto-archive:** Files older than 6 months are moved to `data/history/archive/`. Archived files are still readable via "Load Older History" in the UI.

**Concurrency safety:** Each operation writes its own file (no shared append). OneDrive/SharePoint syncs individual files reliably. The reader scans the directory and assembles the list, tolerating partially-synced files gracefully.

## 5. Metadata Tree (Component Browser)

The searchable, categorized tree for selecting metadata components. Used in both Retrieve and Deploy wizards.

### 5.1 Data Source

- `sf org list metadata-types --target-org {alias}` → gets all available types
- `sf org list metadata --metadata-type {type} --target-org {alias}` → gets components per type
- Results are cached locally per org. Cache refreshed on demand ("Refresh" button) or when stale (>1 hour).

### 5.2 Category Grouping

Components are grouped into friendly categories that match how admins think about Salesforce:

| Category | Metadata Types Included |
|---|---|
| **Automation** | Flow, WorkflowRule |
| **Objects & Fields** | CustomObject, CustomField, RecordType, ValidationRule, FieldSet |
| **Layouts & Pages** | Layout, FlexiPage (Lightning Pages), CompactLayout, HomePageLayout |
| **Profiles & Permissions** | PermissionSet, PermissionSetGroup, Profile |
| **Apex Code** | ApexClass, ApexTrigger, ApexComponent, ApexPage |
| **Lightning Components** | LightningComponentBundle (LWC), AuraDefinitionBundle |
| **Reports & Dashboards** | Report, Dashboard, ReportType |
| **Email & Templates** | EmailTemplate, Letterhead |
| **Other** | Everything else |

Each category shows a component count badge. Categories expand to show individual components.

### 5.3 Display Format

Each component shows:
- **Friendly name** (large text)
- **API name** (small secondary text, for developers who need it)
- **Last modified date** and **last modified by** (from metadata API)
- Checkbox for selection

### 5.4 Search

A search bar at the top of the tree. When the user types:
- All categories collapse except those with matching items
- Matches are highlighted
- Searches across both friendly name and API name
- Debounced (300ms) to avoid excessive filtering

### 5.5 Recently Modified Filter

A toggle: "Show only recently modified (last 7 days)". This is the most useful filter for daily work — it answers "what did I change?" without having to remember.

### 5.6 Saved Bundles

Users can save a selection as a named bundle:
- "Save Selection As..." → enter a name (e.g., "Pricing Flow Bundle")
- Stored as JSON files in `data/bundles/{name}.json`
- On the shared drive, so the whole team can use them
- A "Load Bundle" dropdown appears at the top of the component selector
- Bundles can be updated or deleted

## 6. Progress Tracker

Used for both Retrieve and Deploy operations. Designed to feel like a progress tracker, NOT a terminal.

### 6.1 Default View (Clean)

- **Overall progress bar** with percentage and elapsed time
- **Component list** — each component is a row:
  - Spinner icon → deploying
  - Green checkmark → succeeded
  - Red X → failed
  - Grey circle → pending
  - Component name and type
- **Step counter:** "Deploying component 3 of 12..."

### 6.2 Expandable Raw Log

- A collapsible "Show Details" panel at the bottom
- Contains the raw `sf` CLI output for the one developer on the team who wants to see it
- Hidden by default — the clean view is the primary interface

### 6.3 Real-Time Streaming

- Backend invokes `sf` CLI commands with `--json` flag where available for reliable structured output parsing
- For progress display, the raw (non-JSON) stdout is also streamed for the "Show Details" log panel
- Backend streams updates to the frontend via WebSocket
- Frontend parses the structured output to update the component list in real-time
- If the browser tab is closed and reopened, the app reconnects and shows current state of any in-progress operation
- Running operations are tracked server-side by operation ID, preventing orphaned processes

## 7. Error Handling

### 7.1 Error Translation

A lookup table of the 10-15 most common Salesforce deployment errors, mapping raw error codes to:
- **Plain-English explanation** of what went wrong
- **What to do** — actionable remediation step

| Error Code | Plain English | What To Do |
|---|---|---|
| `FIELD_INTEGRITY_EXCEPTION` | A required field is missing or a lookup references something that doesn't exist in the target org. | Check that all referenced objects and fields exist in the target org. |
| `INSUFFICIENT_ACCESS` | Your user doesn't have permission to deploy this component. | Ask your Salesforce admin for the "Modify Metadata" permission in the target org. |
| `DUPLICATE_VALUE` | This component already exists in the target org with a different configuration. | Check the existing component in the target org and resolve the conflict manually. |
| `UNKNOWN_EXCEPTION` | Salesforce encountered an unexpected error. | Try again in a few minutes. If it persists, note the ErrorId and contact Salesforce support. |
| `TEST_FAILURE` | Apex tests failed in the target org during deployment. | Fix the failing test classes or deploy with "Skip Tests" if available for sandboxes. |
| `MISSING_REQUIRED_FIELD` | A required field on a record or component is not set. | Check that all required fields are populated in your source metadata. |
| `INVALID_CROSS_REFERENCE_KEY` | A reference points to a record or component that doesn't exist in the target org. | Deploy the referenced component first, then retry. |
| `FIELD_CUSTOM_VALIDATION_EXCEPTION` | A validation rule is blocking the deployment. | Check validation rules in the target org that may conflict. |

For unknown errors: display the raw message with a "Copy Error" button and note: "Share this with your team lead or Salesforce admin for help."

### 7.2 Auth Errors

- Detected before operations begin (pre-flight check)
- Shown as: "[Org Name] session has expired. Click to log in again."
- Not shown as raw 401 or `INVALID_SESSION_ID`

### 7.3 Network Errors

- Detected and shown as: "Unable to connect to Salesforce. Check your internet connection and try again."
- Not shown as `ECONNREFUSED` or `fetch failed`

### 7.4 Partial Deploy Failures

When some components succeed and others fail:
- Clear accounting: "8 of 10 components deployed successfully. 2 failed."
- Explicit statement: "The 8 successful components ARE live in the target org."
- "Retry Failed Only" button — re-deploys only the failed components
- "Rollback All" button — reverts only the successfully deployed components to their pre-deploy state (failed components are skipped since they were never changed)

## 8. Safety Features

### 8.1 Mandatory Validation (Dry Run)

Every deploy goes through a validation step first. The "Deploy" button is only enabled after validation passes. This is the primary anxiety reducer for CLI-shy users.

### 8.2 Deploy Locks

Before deploying, the backend writes a lock file to the shared folder:
```
data/{orgAlias}.deploy.lock
```

Contents:
```json
{
  "user": "john.smith",
  "orgAlias": "Production",
  "startedAt": "2026-03-24T14:30:00Z",
  "components": ["Flow:Lead_Assignment_Flow"]
}
```

If a lock exists when another user tries to deploy to the same org:
- Warning message: "John is currently deploying to Production (started 3 min ago)."
- Option to wait or proceed anyway
- Stale locks (>30 minutes) are auto-cleared

Lock is deleted when the deploy completes (success or failure).

**Known limitation:** On SharePoint/OneDrive, sync delay (5-30 seconds) means two users on different machines could both see "no lock" and proceed simultaneously. This is acceptable for a team of 5-8 with infrequent deploys. The lock file includes a PID so on startup the server can detect and clean up orphaned locks from crashed processes.

### 8.3 Auto-Rollback Snapshots

Before every deploy:
1. Backend retrieves the current version of the target components from the target org
2. Stores them in `data/rollbacks/{deployId}/`
3. Links the rollback to the history record

If the user clicks "Rollback" in History or after a failed deploy:
1. The app deploys the saved snapshot back to the target org
2. Records this as a new history entry (type: "rollback")

Rollback snapshots are cleaned up after 90 days.

### 8.4 Production Safeguards

- Production orgs have a red/orange visual badge everywhere they appear
- Deploying to production requires an extra confirmation: type the org name to confirm
- Production deploys are highlighted in the History page

## 9. Startup & Prerequisites

### 9.1 One-Click Launcher

**macOS (`Start SF Deploy.command`):**
```bash
#!/bin/bash
cd "$(dirname "$0")"

# Check prerequisites
if ! command -v sf &> /dev/null; then
    # Show install instructions (opens in browser or prints)
    echo "Salesforce CLI not found. Install: npm install @salesforce/cli -g"
    read -p "Press Enter to exit..."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "Node.js not found. Install from https://nodejs.org"
    read -p "Press Enter to exit..."
    exit 1
fi

# Install deps if needed
[ ! -d "node_modules" ] && npm install

# Start server and open browser
node server/index.js &
sleep 2
open http://localhost:3000

# Minimize terminal (AppleScript)
osascript -e 'tell application "Terminal" to set miniaturized of front window to true'

wait
```

**Windows (`Start SF Deploy.bat`):**
```batch
@echo off
cd /d "%~dp0"
where sf >nul 2>nul || (echo Salesforce CLI not found. Install: npm install @salesforce/cli -g & pause & exit)
where node >nul 2>nul || (echo Node.js not found. Install from https://nodejs.org & pause & exit)
if not exist node_modules npm install
start /b node server/index.js
timeout /t 3 /nobreak >nul
start http://localhost:3000
```

**Note:** Both launchers start the server first, then open the browser. Alternatively, the Express server can open the browser itself once it is listening (using the `open` npm package), which eliminates the race condition on both platforms and handles dynamic port assignment correctly. This is the recommended approach.

### 9.2 Startup Health Check

When the Express server starts, it runs:
1. `sf --version` — verify CLI is installed and get version
2. `node --version` — verify Node.js version (minimum v18)
3. Check if shared data folder is accessible
4. Check for port conflicts (try 3000, then 3001, 3002, etc.)
5. Check for orphaned child processes from a previous crash (PID file)

If any check fails, the browser shows a clear diagnostic page instead of the app.

### 9.3 Port Handling

- Default port: 3000
- If port 3000 is in use, try 3001, 3002, etc. (up to 3010)
- If a running instance is detected on the default port, open the browser to that instance instead of starting a new one
- Display the actual URL in the terminal window

## 10. Visual Design

### 10.1 Theme

- **Dark developer theme** — background `#1e1e2e`, surfaces `#252536`
- **Primary accent:** Indigo `#6366f1` for active states, buttons, wizard progress
- **Secondary accent:** Purple `#a855f7` for gradients (logo, highlights)
- **Success:** Green `#4ade80`
- **Error:** Red `#f87171`
- **Warning:** Amber `#fbbf24`
- **Text:** Primary `#e2e8f0`, secondary `#a0a0b8`, muted `#71717a`
- **Font:** System font stack (no custom fonts needed)
- **Border radius:** 8px for cards, 6px for buttons, 50% for status dots

### 10.2 Responsive Behavior

This is a desktop tool. Minimum supported width: 1024px. No mobile layout needed. The sidebar collapses to icons-only below 1200px.

## 11. API Endpoints

### 11.1 Orgs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orgs` | List all authenticated orgs with health status |
| POST | `/api/orgs/connect` | Start OAuth flow for a new org |
| POST | `/api/orgs/:alias/refresh` | Re-authenticate an expired org |
| DELETE | `/api/orgs/:alias` | Remove an org connection |
| GET | `/api/orgs/:alias/health` | Check single org auth health |

### 11.2 Metadata

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/metadata/:orgAlias/types` | List metadata types (categorized) |
| GET | `/api/metadata/:orgAlias/components?type=Flow` | List components of a type |
| GET | `/api/metadata/:orgAlias/search?q=Lead` | Search across all types |
| POST | `/api/metadata/:orgAlias/refresh` | Clear cache and reload |

### 11.3 Retrieve

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/retrieve` | Start a retrieve operation |
| GET | `/api/retrieve/:id/status` | Get operation status (also via WebSocket) |

### 11.4 Deploy

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/deploy/validate` | Run dry-run validation |
| POST | `/api/deploy` | Start a deploy operation |
| POST | `/api/deploy/:id/retry-failed` | Retry only failed components |
| POST | `/api/deploy/:id/rollback` | Rollback a completed deploy |
| GET | `/api/deploy/:id/status` | Get operation status (also via WebSocket) |

### 11.5 History

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/history?user=&org=&status=&from=&to=` | Query history with filters |
| GET | `/api/history/:id` | Get single history entry details |

### 11.6 Bundles

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bundles` | List saved bundles |
| POST | `/api/bundles` | Save a new bundle |
| PUT | `/api/bundles/:name` | Update a bundle |
| DELETE | `/api/bundles/:name` | Delete a bundle |

### 11.7 WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `operation:progress` | Server → Client | `{ operationId, component, status, message }` |
| `operation:complete` | Server → Client | `{ operationId, status, summary }` |
| `operation:error` | Server → Client | `{ operationId, error, translation }` |
| `org:status-change` | Server → Client | `{ orgAlias, status }` |

## 12. Out of Scope (Phase 2)

These features are valuable but deferred to keep the MVP focused:

- **Combined "Transfer" flow** — retrieve from A and deploy to B in a single wizard
- **Destructive deployments** — deleting metadata from target orgs (requires `destructiveChanges.xml`)
- **Light theme toggle** — dark is the default; light mode can be added later
- **Bundled Node.js** — for now, Node.js is a prerequisite; later we can bundle it
- **Component diff view** — side-by-side comparison of source vs target XML
- **Org comparison** — full metadata diff between two orgs
- **User accounts / roles** — no login, everyone sees everything, identified by OS username
- **Scheduled deployments** — deploy at a future time
- **Approval workflows** — require sign-off before production deploys

## 13. Success Criteria

The tool is successful when:

1. Any team member can connect to their Salesforce orgs without touching the terminal
2. Any team member can retrieve specific components from a sandbox
3. Any team member can deploy components to another org with confidence (validation step)
4. The team has shared visibility into who deployed what and when
5. Failed deployments show actionable error messages, not raw CLI output
6. No one on the team needs to learn `sf` CLI commands to do their job
