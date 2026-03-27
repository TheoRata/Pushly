# Pushly

**Deploy Salesforce metadata without touching the terminal.**

Pushly is a free, open-source web UI that wraps the Salesforce CLI. It gives admin teams guided wizard flows to retrieve and deploy metadata between orgs — no CLI knowledge required.

![Pushly Deploy Flow](docs/screenshots/deploy-flow.gif)

## Why Pushly?

- **Change Sets are slow** — Pushly loads metadata in seconds with search and filtering
- **The CLI is intimidating** — Pushly gives you point-and-click wizards instead
- **Enterprise tools cost $200+/user/month** — Pushly is free

## Features

- **Wizard-based retrieve & deploy** — Step-by-step flows with validation
- **Searchable metadata tree** — Find components instantly across categories
- **Validation before deploy** — Dry-run deployments to catch errors before they hit production
- **One-click rollback** — Pre-deploy snapshots let you revert if something goes wrong
- **Shared team history** — Everyone sees who deployed what, when
- **Plain-English errors** — Salesforce error codes translated to actionable messages

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`) installed and on PATH
- At least one authenticated Salesforce org (`sf org login web`)

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/pushly.git
cd pushly
npm install
npm run build
npm start
```

Your browser opens to `http://localhost:3000`. That's it.

### Development

```bash
npm run dev    # Express on :3000 + Vite on :5173 with hot reload
npm test       # Run all tests
```

## How It Works

1. **Connect orgs** — Pushly detects orgs already authenticated via Salesforce CLI
2. **Retrieve metadata** — Browse and select components from a searchable tree
3. **Deploy with confidence** — Validate first (dry run), then deploy with real-time progress
4. **Roll back if needed** — Every deploy creates a snapshot you can restore

## Team Setup (Shared Drive)

Pushly runs locally but stores history on a shared folder. Put the project on OneDrive, SharePoint, or any shared drive — your whole team sees the same deploy history.

See [QUICKSTART.txt](QUICKSTART.txt) for detailed team setup instructions.

## Tech Stack

- **Frontend:** Vue 3 + Vite + Tailwind CSS v4
- **Backend:** Node.js + Express + WebSocket
- **CLI:** Wraps Salesforce CLI (`sf`) commands
- **Data:** JSON files (no database required)

## License

[Elastic License 2.0](LICENSE) — free to use, self-host, and modify. You may not offer Pushly as a hosted service to third parties.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.
