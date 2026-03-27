# Pushly — Scaling Strategy & Phase 1 Design Spec

## Overview

Pushly (formerly SF Deploy Manager) is a local web UI wrapping the Salesforce CLI that lets admin teams retrieve and deploy metadata between orgs via guided wizard flows. This spec covers the business strategy for scaling Pushly from a working MVP into a sustainable product, and the detailed Phase 1 plan for public launch.

## Business Strategy

### Model: Open Source Wedge, Cloud Upsell

One product, two delivery modes:

| | Self-Hosted (free) | Cloud (paid) |
|---|---|---|
| Features | All | All |
| User manages | Node.js, SF CLI, shared drive | Nothing — just a URL |
| Auth | OS username | Email + password (later SSO) |
| SF tokens | Managed by SF CLI locally | Encrypted in DB per user |
| History/data | JSON files on shared drive | PostgreSQL |
| Price | $0 forever | $79/team/mo (up to 8 users) |
| License | Elastic License 2.0 (ELv2) | SaaS subscription |

No feature gates on self-hosted. The cloud version sells convenience, not features. The free self-hosted version is the marketing engine — every user is a potential cloud customer.

**"Team" definition:** One team subscription covers one production org and all its connected sandboxes/scratch orgs. Teams managing multiple unrelated production orgs need one subscription per production org.

### Future Tiers (only when traction justifies)

| Tier | Price | Includes |
|---|---|---|
| Cloud | $79/team/mo (up to 8 users) | Zero setup, managed hosting |
| Cloud Plus | $149/team/mo (up to 15 users) | Priority support, multiple prod orgs |
| Enterprise Cloud | $249/team/mo (unlimited users) | SSO/SAML, audit log export, approval workflows |

### Target Market

- Salesforce admin teams (3-8 people) without CI/CD or Git
- Currently using Change Sets (41.8% of SF admins — ~63,000 orgs)
- Can't afford Gearset (~$200/user/mo) or Copado (~$250/user/mo)
- A team of 8 on Gearset costs ~$1,600/mo vs Pushly at $79/mo — 95% savings

**Note:** Gearset and Copado offer far more than deployment (CI/CD, testing, version control). Pushly does one thing well: metadata deployment via wizard. The pricing reflects this narrower scope. The $79 price point needs validation via the cloud waitlist before committing.

### Competitive Position

No active, free, standalone web GUI for SF metadata deployment exists. Closest tools:
- sfdx-hardis (332 stars, but requires VS Code)
- Salesforce Inspector Reloaded (Chrome ext, not a deploy workflow)
- 5+ abandoned GitHub attempts at exactly this tool

### Founder Context

- Solo founder, nights & weekends (10-15 hrs/week)
- Bootstrapped, no external funding
- Traction-guided monetization — let users signal when to charge
- Lifestyle business first, scale or exit if it takes off
- SF CLI dependency now, direct Metadata API later if needed

## Product Roadmap

### Phase 1: GitHub Launch + Landing Page (5-7 weeks) ← THIS SPEC

Two deliverables:
1. Pushly repo — cleaned up, rebranded, GitHub-ready
2. pushly.dev (or similar) — landing page with GitHub link + cloud waitlist

### Phase 2: Storage Abstraction Layer (2-3 weeks)

Extract StorageInterface with FileStorage and DatabaseStorage implementations. MODE=local / MODE=cloud environment switch. No feature changes — same app, swappable backend.

### Phase 3: Cloud Version MVP (4-6 weeks)

Auth (email + password + JWT), multi-tenancy (PostgreSQL), server-side SF OAuth, deploy to Railway/Fly.io, Stripe integration ($79/team/mo, 14-day free trial), onboarding wizard.

### Phase 4: Growth Features (Month 4-6)

Org comparison/diff, scheduled deployments, Slack/Teams notifications, improved metadata browser. Driven by user feedback.

### Phase 5: Enterprise Tier (Month 6-12)

SSO/SAML, audit log export, approval workflows, org health monitoring. Only if traction justifies it.

### Phase 6: Direct API Migration (Month 12+)

Replace SF CLI spawning with direct Metadata API / Tooling API calls via JSforce. Only if CLI instability forces it.

## Phase 1 Detailed Design

### Deliverable 1: GitHub Repo Polish

| Task | Details |
|---|---|
| Rename to Pushly | Package names, titles, launcher scripts, CLAUDE.md |
| README.md | Hero line, GIF demo, feature list, 5-min quickstart, screenshot |
| LICENSE | Elastic License 2.0 (ELv2) — allows free use, self-hosting, modification; prohibits offering as a managed service |
| .env.example | Document all configurable env vars |
| Clean data/ | Remove dev history records, test workspaces, personal artifacts |
| CONTRIBUTING.md | How to contribute, dev setup, PR guidelines |
| Error polish | No raw stack traces in UI — all errors through error-translator |
| Meta tags | package.json description, keywords, repository URL |

### Deliverable 2: Landing Page (pushly-site)

Separate repo, same tech stack (Vue 3 + Vite + Tailwind CSS v4), deployed to Vercel or Cloudflare Pages.

#### Page Sections

| # | Section | Content |
|---|---|---|
| 1 | Hero | Headline: "Deploy Salesforce metadata without touching the terminal" — Subline: "Free, open source, built for admin teams" — CTA: [Get Started - GitHub] — 15-sec GIF of a deploy flow |
| 2 | Pain points | 3 cards: Change Sets are slow / CLI requires expertise / Enterprise tools cost $200+/user/mo |
| 3 | How it works | 3-step visual: Connect Orgs → Select Metadata → Deploy with Confidence — actual screenshots |
| 4 | Features | 6-item grid: Wizard deploy, Searchable metadata tree, Validation, Rollback, Team history, Plain-English errors |
| 5 | Who is Pushly for? | Persona description: "Admin teams who build in Salesforce but don't live in the terminal. Teams that need reliable deployments without a $20K/year DevOps platform." |
| 6 | Cloud waitlist | "Pushly Cloud is coming — zero setup, connect your orgs from any browser" — Email input + "Notify Me" button |
| 7 | Footer | GitHub link, license note, creator attribution |

**Note:** No comparison table against named competitors. The "Who is Pushly for?" section positions the tool without legal risk or accuracy concerns from naming Gearset/Copado directly.

#### Design Direction

- Dark theme matching the app (same CSS variables)
- Single page, no navigation needed
- Mobile-responsive
- Lighthouse performance score target: 90+
- Basic SEO: meta description, Open Graph tags, semantic HTML
- Accessible: sufficient color contrast, form labels, keyboard navigable

#### Email Capture Security

Supabase free tier — one table (`waitlist`: id, email, created_at).

Security requirements:
- Row Level Security (RLS) enabled: anon role can INSERT only, no SELECT/UPDATE/DELETE
- Rate limiting: client-side debounce + Supabase's built-in rate limits
- Duplicate prevention: unique constraint on email column
- The Supabase anon key will be visible in client JS — this is acceptable because RLS restricts operations to INSERT-only

#### Analytics

Plausible Analytics (free self-hosted or $9/mo cloud) for:
- Landing page visits and traffic sources
- Waitlist conversion rate
- GitHub link click-through rate

This data is needed to evaluate which go-to-market channels work.

### Learning-by-Building Approach

The founder will build the landing page themselves to learn the tech stack. The implementation is structured as a progressive learning roadmap.

#### Track 1: HTML + CSS Foundations (1-2 weeks)

Goal: Build a static version of the landing page with just HTML + CSS.

| # | Task | Concept |
|---|---|---|
| 1.1 | Build a box with centered text, dark background, white text | Box model, background, text alignment |
| 1.2 | Build the hero — headline, subline, two buttons side by side | Flexbox, padding, margin, font sizing |
| 1.3 | Build 3-column card layout (pain points) | CSS Grid or Flexbox multi-column, border-radius, shadows |
| 1.4 | Make cards stack vertically on small screens | Media queries, responsive basics |
| 1.5 | Build the comparison table | HTML table, table styling, alternating rows |
| 1.6 | Build email input + button (waitlist form) | Form elements, input styling, hover states |
| 1.7 | Assemble all sections into one scrolling page | Section spacing, CSS variables, full-page layout |

Outcome: A complete static HTML/CSS page. No framework, no JS.

#### Track 2: Tailwind CSS v4 (3-5 days)

Goal: Rebuild the same page with Tailwind to understand utility-first CSS.

**Important:** Tailwind CSS v4 uses CSS-based configuration (`@theme` directive) instead of the `tailwind.config.js` file from v3. Follow the v4 docs specifically — most online tutorials are still v3.

| # | Task | Concept |
|---|---|---|
| 2.1 | Set up a Vite project with Tailwind CSS v4 (@tailwindcss/vite plugin), rebuild the hero | Tailwind v4 setup, utility classes: flex, text-center, bg-, p-, text-xl |
| 2.2 | Rebuild cards + make responsive | grid, grid-cols-3, md:grid-cols-1, responsive prefixes |
| 2.3 | Add hover effects and transitions | hover:, transition, duration-, transform |
| 2.4 | Apply dark theme using @theme directive and CSS variables | @theme custom colors, CSS variable integration |

Outcome: Same page, rebuilt with Tailwind v4.

#### Track 3: Vue 3 Fundamentals (1-2 weeks)

Goal: Convert static page into a Vue app with interactivity.

| # | Task | Concept |
|---|---|---|
| 3.1 | Create Vite + Vue project, render "Hello World" | Scaffolding, npm create vue, dev server |
| 3.2 | Create HeroSection.vue — move hero HTML into it | Single File Components, template/script/style |
| 3.3 | Create components per section, compose in App.vue | Component imports, composition, props |
| 3.4 | Make email input reactive — show typed value in real-time | ref(), v-model, reactivity, interpolation |
| 3.5 | Add email validation — disable button if invalid | computed(), conditional :class, v-bind |
| 3.6 | Submit email to Supabase, show "Thank you" on success | async/await, fetch(), API calls, v-if/v-else |
| 3.7 | Deploy to Vercel — get a live URL | Build command, Vercel CLI or GitHub integration, env vars |

Outcome: A working, deployed landing page the founder built and understands.

#### Optional: Polish Track (after launch)

| # | Task | Concept |
|---|---|---|
| P.1 | Add smooth scroll when clicking anchor links | ref() for DOM elements, scrollIntoView() |
| P.2 | Add scroll-triggered fade-in on sections | onMounted(), IntersectionObserver |
| P.3 | Record and embed a demo GIF/video | Screen recording, GIF optimization |

These are nice-to-haves. Ship first, polish later.

#### Track 4: Repo Polish (after Track 1, before or during Track 3)

| # | Task | Details |
|---|---|---|
| 4.1 | Rename all references from "SF Deploy Manager" to "Pushly" | package.json, CLAUDE.md, launcher scripts, UI titles |
| 4.2 | Write README.md with feature list and quickstart | Markdown, badges, structured docs |
| 4.3 | Add Elastic License 2.0 file | Copy ELv2 text, understand what it permits |
| 4.4 | Clean data/ and workspaces/ of personal artifacts | .gitignore review, remove tracked dev data |
| 4.5 | Write CONTRIBUTING.md | Dev setup steps, PR guidelines, code style |
| 4.6 | Add .env.example | Document PORT, MODE, and any other env vars |

### Timeline

| Track | Estimated time |
|---|---|
| Track 1: HTML + CSS | 1-2 weeks |
| Track 2: Tailwind v4 | 3-5 days |
| Track 3: Vue 3 | 1-2 weeks |
| Track 4: Repo polish | 1 week |
| Buffer for debugging/getting stuck | 3-5 days |
| **Total Phase 1** | **5-7 weeks** |

## Known Limitations (Phase 1)

- **SF CLI version dependency:** If Salesforce ships a breaking CLI update, Pushly may break. Mitigation: pin a minimum supported SF CLI version in prerequisites, test against new releases monthly.
- **No self-hosted → cloud migration path:** Teams starting with self-hosted JSON files will not be able to migrate history/bundles to the cloud version. This is acceptable at Phase 1. Migration tooling is a Phase 3 consideration.
- **Domain availability:** "pushly.dev" may be taken. Alternatives: pushly.io, getpushly.com, pushly.app. Check availability before starting Track 3.
- **Supabase free tier limits:** 50,000 rows, 500MB database. More than sufficient for a waitlist. Monitor if signups exceed expectations.
- **AppExchange compatibility with ELv2:** The Elastic License 2.0 may need review for AppExchange listing requirements. Investigate during Phase 2, not Phase 1.

## If Launch Gets No Traction

If the repo has <10 stars and <5 waitlist signups after 4 weeks of active promotion:

1. **Check the message:** Is "deploy without terminal" resonating? Post on r/salesforce asking what admins actually struggle with in deployments.
2. **Check the channel:** Try a different channel — if Reddit didn't work, try a Salesforce Ben article or YouTube demo.
3. **Check the product:** Is the 5-minute setup actually 5 minutes? Have someone outside SF try it and watch where they get stuck.
4. **Decide:** If 8 weeks of effort yields no signal, pause the project. The market research is sound but distribution may need a fundamentally different approach (e.g., Chrome extension instead of standalone app, or VS Code extension).

## Go-to-Market (Post Phase 1)

### Free Distribution Channels

1. Salesforce Ben guest post — write "I built a free alternative to Change Sets"
2. Reddit (r/salesforce, r/salesforceadmin) — reply to deployment complaints naturally
3. awesome-sfdx-plugins GitHub list — submit for inclusion
4. YouTube — 5-min "Deploy without the terminal" tutorial
5. LinkedIn — weekly build-in-public posts
6. Trailblazer Community Groups — present at local meetups

### Medium-Term Growth

7. AppExchange free listing (after license compatibility review)
8. Community "Dreamin'" events — submit talk proposals
9. TrailblazerDX speaker application
10. ISV Partner Program (free Registered tier)

## Success Criteria for Phase 1

- [ ] Pushly repo is public on GitHub with README, LICENSE, CONTRIBUTING
- [ ] Landing page is live with working waitlist
- [ ] Analytics tracking page visits and waitlist conversions
- [ ] First post on r/salesforce or Salesforce Ben submitted
- [ ] 10+ GitHub stars within first 2 weeks
- [ ] 20+ waitlist signups within first month
