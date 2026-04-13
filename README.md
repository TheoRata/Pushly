# Pushly

**Deploy Salesforce metadata without touching the terminal.**

Pushly is a free, open-source web UI that wraps the Salesforce CLI. It gives admin teams guided wizard flows to retrieve, compare, and deploy metadata between orgs — no CLI knowledge required.

## Why Pushly?

- **Change Sets are slow** — Pushly loads metadata in seconds with fuzzy search and filtering
- **The CLI is intimidating** — Pushly gives you point-and-click wizards instead
- **Enterprise tools cost $200+/user/month** — Pushly is free
- **Self-host with Docker** — One command to run, zero infrastructure to manage

## Features

- **Retrieve Wizard** — 4-step flow to pull metadata from any connected org with cherry-pick or all-metadata modes
- **Deploy Wizard** — 5-step flow with mandatory validation before deploy, rollback snapshots, and deploy locking
- **Org Comparison** — Side-by-side metadata diff between two orgs with drill-down into individual components
- **Component Browser** — Fuzzy search across metadata types, category sidebar, virtual scrolling, and bundle save/load
- **Real-time Progress** — WebSocket-driven per-component status tracking during retrieve and deploy operations
- **One-click Rollback** — Pre-deploy snapshots let you revert if something goes wrong
- **Plain-English Errors** — Salesforce error codes translated to actionable messages
- **Operation History** — Paginated log of all retrieve/deploy operations
- **Glass Design System** — Custom UI components with dark/light mode support

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/TheoRata/Pushly.git
cd Pushly
docker compose up
```

Open `http://localhost:3000` and connect your first org.

> **Port 1717** is mapped in addition to 3000. It's used by the Salesforce CLI's OAuth callback server when you log in to an org from the browser. Both ports must be free on the host.

### Option 2: Run Locally

**Prerequisites:**
- [Node.js](https://nodejs.org/) 18 or later
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`) installed and on PATH

```bash
git clone https://github.com/TheoRata/Pushly.git
cd Pushly
npm install
npm run build
npm start
```

Your browser opens to `http://localhost:3000`. That's it.

### Migrating from v1 (JSON files)

If you have existing data from the JSON file-based version, run the migration script:

```bash
node server/scripts/migrate-json-to-sqlite.js
```

### Development

```bash
npm run dev    # Express on :3000 + Vite on :5173 with hot reload
npm test       # Run all tests
```

## How It Works

1. **Connect orgs** — Log in via Salesforce OAuth (Connected App), or Pushly detects orgs already authenticated via the SF CLI or VS Code Salesforce Extension
2. **Retrieve metadata** — Browse and select components from a searchable tree with fuzzy matching
3. **Compare orgs** — Pick two orgs and see a side-by-side diff of their metadata inventories
4. **Deploy with confidence** — Validate first (dry run), then deploy with real-time progress
5. **Roll back if needed** — Every deploy creates a snapshot you can restore

## Architecture

```
pushly/
├── server/          # Node.js + Express backend (ES modules)
│   ├── routes/      # REST API (orgs, metadata, retrieve, deploy, compare, history, bundles, oauth)
│   ├── services/    # SF CLI wrapper, SQLite database, operations tracking, rollback, workspace
│   └── utils/       # Error translation, prerequisites check
├── client/          # Vue 3 + Vite + Tailwind CSS v4 frontend
│   └── src/
│       ├── views/       # Dashboard, Orgs, Retrieve, Compare, Deploy, History
│       ├── components/  # Glass design system + metadata browser
│       └── composables/ # Shared state (useApi, useWebSocket, useMetadata, useCompare, etc.)
├── Dockerfile       # Multi-stage build with SF CLI
├── docker-compose.yml
└── package.json
```

**Data flow:** Browser &rarr; REST API + WebSocket &rarr; Express &rarr; `sf` CLI &rarr; Salesforce orgs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite 6, Tailwind CSS v4 |
| Backend | Node.js, Express |
| Database | SQLite (via better-sqlite3) |
| Real-time | WebSocket (`ws`) |
| Salesforce | SF CLI (`sf`) |
| Testing | Vitest |
| Deployment | Docker, Docker Compose |

## OAuth Setup (Optional)

To let users log in directly from Pushly instead of using the SF CLI:

1. In Salesforce Setup, go to **App Manager** → **New Connected App**
2. Enable OAuth, add `api` and `refresh_token` scopes
3. Set the callback URL to `http://localhost:3000/api/oauth/callback`
4. Copy `.env.example` to `.env` and fill in:

```env
SF_CLIENT_ID=your_consumer_key
SF_CLIENT_SECRET=your_consumer_secret
SF_CALLBACK_URL=http://localhost:3000/api/oauth/callback
```

Without these, users can still connect orgs that are already authenticated via the SF CLI or VS Code Salesforce Extension.

## Self-Hosting

Pushly is designed to be self-hosted. Run it with Docker or directly with Node.js. All data is stored in a single SQLite database file (`data/pushly.db`) — easy to back up and migrate.

Set `PUSHLY_DATA_DIR` to customize where Pushly stores its database and rollback snapshots.

## License

[Elastic License 2.0](LICENSE) — free to use, self-host, and modify. You may not offer Pushly as a hosted service to third parties.

## Contributing

Contributions welcome! Open an issue or submit a pull request.
