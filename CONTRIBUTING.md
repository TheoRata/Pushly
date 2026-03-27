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
