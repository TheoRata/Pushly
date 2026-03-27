# Pushly Repo Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand SF Deploy Manager to Pushly, clean up dev artifacts, and make the repo GitHub-ready with README, LICENSE, and CONTRIBUTING.

**Architecture:** Find-and-replace branding across 3 package.json files, 3 Vue components, 1 HTML file, 1 shell script, and 1 CLAUDE.md. Add LICENSE (ELv2), README.md, CONTRIBUTING.md, and .env.example. Remove personal dev data from data/ and workspaces/.

**Tech Stack:** No new dependencies. Text editing only.

---

### Task 1: Rename package.json files

**Files:**
- Modify: `package.json`
- Modify: `server/package.json`
- Modify: `client/package.json`

- [ ] **Step 1: Update root package.json**

Change `name` field and add metadata:

```json
{
  "name": "pushly",
  "description": "Deploy Salesforce metadata without touching the terminal",
  "keywords": ["salesforce", "metadata", "deploy", "admin", "sf-cli", "devops"],
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/pushly"
  },
  "license": "Elastic-2.0",
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

- [ ] **Step 2: Update server/package.json**

Change the `name` field:

```json
"name": "pushly-server"
```

- [ ] **Step 3: Update client/package.json**

Change the `name` field:

```json
"name": "pushly-client"
```

- [ ] **Step 4: Verify no broken references**

Run: `npm test`
Expected: All 32 tests pass (package name doesn't affect tests).

- [ ] **Step 5: Commit**

```bash
git add package.json server/package.json client/package.json
git commit -m "chore: rename package to pushly"
```

---

### Task 2: Rename UI branding

**Files:**
- Modify: `client/index.html` (line 7: `<title>SF Deploy Manager</title>`)
- Modify: `client/src/components/TopNavBar.vue` (line 37: `SF Deploy Kit`)
- Modify: `client/src/components/Sidebar.vue` (line 83: `SF Deploy Kit`)
- Modify: `client/src/views/OrgsPage.vue` (line 85: `Welcome to SF Deploy Manager`)

- [ ] **Step 1: Update client/index.html title**

Change line 7 from:
```html
<title>SF Deploy Manager</title>
```
To:
```html
<title>Pushly</title>
```

- [ ] **Step 2: Update TopNavBar.vue**

Change line 37 from:
```html
<span class="text-sm font-semibold text-[var(--text-primary)]">SF Deploy Kit</span>
```
To:
```html
<span class="text-sm font-semibold text-[var(--text-primary)]">Pushly</span>
```

- [ ] **Step 3: Update Sidebar.vue**

Change line 83 from:
```html
<p class="sidebar-label text-[var(--text-muted)] text-xs">SF Deploy Kit</p>
```
To:
```html
<p class="sidebar-label text-[var(--text-muted)] text-xs">Pushly</p>
```

- [ ] **Step 4: Update OrgsPage.vue**

Change line 85 from:
```html
<h1 class="text-2xl font-bold text-[var(--text-primary)] mb-3">Welcome to SF Deploy Manager</h1>
```
To:
```html
<h1 class="text-2xl font-bold text-[var(--text-primary)] mb-3">Welcome to Pushly</h1>
```

- [ ] **Step 5: Rebuild client**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add client/index.html client/src/components/TopNavBar.vue client/src/components/Sidebar.vue client/src/views/OrgsPage.vue client/dist/
git commit -m "chore: rebrand UI to Pushly"
```

---

### Task 3: Rename launcher scripts and shell script

**Files:**
- Rename: `Start SF Deploy.command` → `Start Pushly.command`
- Rename: `Start SF Deploy.bat` → `Start Pushly.bat`
- Modify: `sf-deploy.sh` (rename to `pushly.sh`, update header text)

- [ ] **Step 1: Rename macOS launcher**

```bash
git mv "Start SF Deploy.command" "Start Pushly.command"
```

If the file doesn't exist in git (it may be untracked), use:
```bash
mv "Start SF Deploy.command" "Start Pushly.command" 2>/dev/null; true
```

- [ ] **Step 2: Rename Windows launcher**

```bash
git mv "Start SF Deploy.bat" "Start Pushly.bat" 2>/dev/null; true
```

If untracked:
```bash
mv "Start SF Deploy.bat" "Start Pushly.bat" 2>/dev/null; true
```

- [ ] **Step 3: Rename and update shell script**

```bash
git mv sf-deploy.sh pushly.sh 2>/dev/null || mv sf-deploy.sh pushly.sh
```

Then update the header in `pushly.sh`. Change lines 3-5 from:
```bash
# Salesforce Deploy Kit — Team-Friendly Wrapper Scripts
# ============================================================
# Usage: ./sf-deploy.sh <command>
```
To:
```bash
# Pushly — Team-Friendly Wrapper Scripts
# ============================================================
# Usage: ./pushly.sh <command>
```

Also update the help function (line 278) from:
```bash
echo "  Salesforce Deploy Kit"
```
To:
```bash
echo "  Pushly"
```

And update all self-references in the help text from `./sf-deploy.sh` to `./pushly.sh`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: rename launcher scripts to Pushly"
```

---

### Task 4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update project name and description**

Change line 7 from:
```
SF Deploy Manager — a local web UI wrapping the Salesforce CLI.
```
To:
```
Pushly — a local web UI wrapping the Salesforce CLI.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore: update CLAUDE.md branding to Pushly"
```

---

### Task 5: Update QUICKSTART.txt

**Files:**
- Modify: `QUICKSTART.txt`

- [ ] **Step 1: Replace all "SF Deploy" references with "Pushly"**

Search for all occurrences of "SF Deploy", "sf-deploy", and "Salesforce Deploy Kit" in `QUICKSTART.txt` and replace with "Pushly" / "pushly".

- [ ] **Step 2: Commit**

```bash
git add QUICKSTART.txt
git commit -m "chore: update QUICKSTART.txt branding to Pushly"
```

---

### Task 6: Add Elastic License 2.0

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create LICENSE file**

Copy the full Elastic License 2.0 text. The official text is at https://www.elastic.co/licensing/elastic-license — create the file with this content:

```
Elastic License 2.0

URL: https://www.elastic.co/licensing/elastic-license

## Acceptance

By using the software, you agree to all of the terms and conditions below.

## Copyright License

The licensor grants you a non-exclusive, royalty-free, worldwide,
non-sublicensable, non-transferable license to use, copy, distribute, make
available, and prepare derivative works of the software, in each case subject
to the limitations and conditions below.

## Limitations

You may not provide the software to third parties as a hosted or managed
service, where the service provides users with access to any substantial set
of the features or functionality of the software.

You may not move, change, disable, or circumvent the license key functionality
in the software, and you may not remove or obscure any functionality in the
software that is protected by the license key.

You may not alter, remove, or obscure any licensing, copyright, or other
notices of the licensor in the software. Any use of the licensor's trademarks
is subject to applicable law.

## Patents

The licensor grants you a license, under any patent claims the licensor can
license, or becomes able to license, to make, have made, use, sell, offer for
sale, import and have imported the software, in each case subject to the
limitations and conditions in this license. This license does not cover any
patent claims that you cause to be infringed by modifications or additions to
the software. If you or your company make any written claim that the software
infringes or contributes to infringement of any patent, your patent license
for the software granted under these terms ends immediately. If your company
makes such a claim, your patent license ends immediately for work on behalf of
your company.

## Notices

You must ensure that anyone who gets a copy of any part of the software from
you also gets a copy of these terms.

If you modify the software, you must include in any modified copies of the
software prominent notices stating that you have modified the software.

## No Other Rights

These terms do not imply any licenses other than those expressly granted in
these terms.

## Termination

If you use the software in violation of these terms, such use is not licensed,
and your licenses will automatically terminate. If the licensor provides you
with a notice of your violation, and you cease all violation of this license
no later than 30 days after you receive that notice, your licenses will be
reinstated retroactively. However, if you violate these terms after such
reinstatement, any additional violation of these terms will cause your licenses
to terminate automatically and permanently.

## No Liability

*As far as the law allows, the software comes as is, without any warranty or
condition, and the licensor will not be liable to you for any damages arising
out of these terms or the use or nature of the software, under any kind of
legal claim.*

## Definitions

The **licensor** is the entity offering these terms, and the **software** is
the software the licensor makes available under these terms, including any
portion of it.

**you** refers to the individual or entity agreeing to these terms.

**your company** is any legal entity, sole proprietorship, or other kind of
organization that you work for, plus all organizations that have control over,
are under the control of, or are under common control with that organization.
**control** means ownership of substantially all the assets of an entity, or
the power to direct its management and policies by vote, contract, or
otherwise. Control can be direct or indirect.

**your licenses** are all the licenses granted to you for the software under
these terms.

**use** means anything you do with the software requiring one of your
licenses.

**trademark** means trademarks, service marks, and similar rights.
```

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "chore: add Elastic License 2.0"
```

---

### Task 7: Clean dev data artifacts

**Files:**
- Clean: `data/history/*.json` (24 dev records)
- Clean: `data/rollbacks/` (8 dev snapshots)
- Clean: `workspaces/` (dev workspaces)
- Modify: `.gitignore`

- [ ] **Step 1: Verify data/ and workspaces/ are in .gitignore**

Check `.gitignore` already contains:
```
data/history/
data/history/archive/
data/rollbacks/
workspaces/
```

If these are already present (they are), no changes needed. These files are not tracked by git — they exist only locally.

- [ ] **Step 2: Add data/bundles/ to .gitignore if missing**

Check if `data/bundles/` is in `.gitignore`. If not, add it:

```
data/bundles/
```

- [ ] **Step 3: Ensure data directories are created on startup**

Verify `server/index.js` already creates `data/history/`, `data/bundles/`, `data/rollbacks/`, and `data/history/archive/` on startup. (It does — lines 28-30 handle this.)

No code changes needed. The app auto-creates these directories when it starts.

- [ ] **Step 4: Commit .gitignore if changed**

```bash
git add .gitignore
git commit -m "chore: ensure all data dirs are gitignored"
```

---

### Task 8: Add .env.example

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```bash
# Pushly Configuration
# Copy this file to .env and adjust as needed.

# Server port (default: 3000, auto-detects 3000-3010 if occupied)
# PORT=3000

# Mode: "local" for shared-drive deployment, "cloud" for hosted (future)
# MODE=local
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add .env.example with documented config"
```

---

### Task 9: Write README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
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
```

- [ ] **Step 2: Create screenshot placeholder directory**

```bash
mkdir -p docs/screenshots
```

Add a note: the GIF (`docs/screenshots/deploy-flow.gif`) will be recorded after the landing page is built. For now, the README references it but it won't render until the GIF exists.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/screenshots/
git commit -m "docs: add README with features, quickstart, and team setup"
```

---

### Task 10: Write CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Create CONTRIBUTING.md**

```markdown
# Contributing to Pushly

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Prerequisites:** Node.js 18+, Salesforce CLI (`sf`)
2. **Clone:** `git clone https://github.com/YOUR_USERNAME/pushly.git`
3. **Install:** `npm install`
4. **Run dev:** `npm run dev` (starts Express on :3000 + Vite on :5173)
5. **Run tests:** `npm test`

## Project Structure

```
pushly/
├── server/          # Node.js + Express backend
│   ├── routes/      # API endpoints
│   ├── services/    # Business logic
│   ├── utils/       # Helpers
│   └── tests/       # Vitest tests
├── client/          # Vue 3 + Vite frontend
│   ├── src/views/   # Page components
│   ├── src/components/  # Reusable components
│   └── src/composables/ # Shared reactive logic
└── data/            # Local JSON storage (gitignored)
```

## Making Changes

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Make your changes
3. Run tests: `npm test`
4. Build the client: `npm run build`
5. Open a PR with a clear description of what changed and why

## Code Style

- ES modules (`import`/`export`, not `require`)
- Vue 3 Composition API with `<script setup>`
- Tailwind CSS v4 utility classes
- Commit messages: `feat:`, `fix:`, `chore:`, `docs:` prefixes

## Reporting Issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Node.js version and OS
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md with dev setup and guidelines"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Build client**

Run: `npm run build`
Expected: Build completes without errors.

- [ ] **Step 3: Grep for any remaining old branding**

```bash
grep -r "SF Deploy\|sf-deploy-manager\|Salesforce Deploy Kit" --include="*.js" --include="*.vue" --include="*.html" --include="*.json" --include="*.md" --include="*.txt" --include="*.sh" -l
```

Expected: Only hits in `docs/superpowers/` (old specs — these are historical docs, leave them). No hits in `server/`, `client/src/`, root config files.

- [ ] **Step 4: Start the app and verify branding**

Run: `npm start`

Check:
- Browser title bar says "Pushly"
- Sidebar shows "Pushly"
- Top nav shows "Pushly"
- Orgs page heading says "Welcome to Pushly"

- [ ] **Step 5: Final commit if anything was missed**

```bash
git add -A
git commit -m "chore: final branding cleanup"
```
