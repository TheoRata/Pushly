# SF Deploy Kit — Full UI Redesign

## Goal

Redesign the entire SF Deploy Kit frontend with a glassmorphism dark aesthetic, top navigation layout, and a new Dashboard home page. The result should feel modern, premium, and intuitive enough for public release to Salesforce admins.

## Audience

Small team of SF admins now, expanding to public/open-source availability. Users are CLI-shy admins who need a visual tool — the UI must be self-explanatory without training.

## Architecture

- **Framework:** Vue 3 Composition API (`<script setup>`), Vue Router, Vite
- **Styling:** Tailwind CSS v4 with CSS custom properties for the glass theme
- **Virtual scrolling:** `vue-virtual-scroller` (already installed)
- **Real-time:** WebSocket for deploy/retrieve progress (no changes to backend)
- **Backend:** No backend changes — this is a pure frontend redesign

## Visual Identity

### Theme: Glassmorphism Dark

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-base` | `#09090b` | Page background |
| `--bg-base-end` | `#18181b` | Gradient end for page background |
| `--glass-bg` | `rgba(255,255,255, 0.03)` | Glass card/surface background |
| `--glass-bg-hover` | `rgba(255,255,255, 0.05)` | Glass hover state |
| `--glass-border` | `rgba(255,255,255, 0.06)` | Glass card borders |
| `--glass-border-hover` | `rgba(255,255,255, 0.10)` | Glass border on hover |
| `--glass-blur` | `blur(20px)` | Backdrop filter for glass |
| `--radius-lg` | `12px` | Large containers, cards |
| `--radius-md` | `8px` | Buttons, inputs, smaller elements |
| `--radius-sm` | `6px` | Tags, badges |
| `--color-primary` | `#8b5cf6` | Primary purple |
| `--color-primary-end` | `#6366f1` | Primary gradient end (indigo) |
| `--color-success` | `#4ade80` | Success states |
| `--color-error` | `#f87171` | Error states |
| `--color-warning` | `#fbbf24` | Warning states |
| `--text-primary` | `rgba(255,255,255, 0.90)` | Primary text |
| `--text-secondary` | `rgba(255,255,255, 0.55)` | Secondary text |
| `--text-muted` | `rgba(255,255,255, 0.30)` | Muted/disabled text |

### Glass Recipe (applied to all surfaces)

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}
```

### Accent Glow (active elements)

```css
.glow {
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.15);
}
```

### Ambient Glow Blobs (optional depth effect on key cards)

Subtle, fixed-position gradient orbs (`border-radius: 50%; filter: blur(60px)`) behind hero sections for depth.

## Layout

### Top Navigation Bar (replaces sidebar)

- **Height:** 56px, fixed at top
- **Style:** Frosted glass with bottom border
- **Left zone:** Logo icon + "SF Deploy Kit" text
- **Center zone:** Navigation tabs as glass pills — Dashboard, Orgs, Retrieve, Deploy, History
- **Right zone:** Connected org count indicator
- **Active tab:** Purple gradient background with subtle glow

### Content Area

- Full width below nav bar
- Max-width container: `1200px`, centered with `mx-auto`
- Padding: `px-6 py-8`
- Page transitions: `mode="out-in"` fade

## Pages

### 1. Dashboard (`/` — NEW)

The home/landing page. Provides at-a-glance status and quick actions.

**Layout:**
- Welcome header: "SF Deploy Kit" + subtitle
- **Stat cards row** (3 cards, grid):
  - Connected Orgs (count, link to /orgs)
  - Recent Deploys — last 7 days (count)
  - Success Rate — percentage of successful deploys
- **Quick actions row:** "New Retrieve" button, "New Deploy" button (purple gradient glass buttons)
- **Recent activity feed:** Last 5 operations as a glass list — each row shows: operation type icon, name/description, org alias, status badge, relative timestamp, component count

**Data source:** Existing `/api/history` endpoint for recent activity, `/api/orgs` for org count.

### 2. Orgs Page (`/orgs`)

**Layout:**
- Page header: "Connected Orgs" title + "Connect Org" button (purple gradient)
- **Org cards grid** (`grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`):
  - Glass card per org
  - Org alias (bold), username (secondary text)
  - Org type badge: glass pill with color coding — Production (red tint), Sandbox (blue tint), Developer (green tint), Scratch (amber tint)
  - Connection status: green/red dot
  - Last used: relative timestamp
  - Actions: Refresh, Reconnect, Remove (icon buttons, glass hover)
- **Empty state:** Centered glass card with illustration, "Connect your first org" CTA
- **One-org state:** Prompt banner to connect second org

**Connect Org Modal:**
- Glass modal with backdrop blur overlay
- Custom domain toggle + input
- Login type selection (Production / Sandbox)
- Waiting state with spinner
- Success/error states

### 3. Retrieve Page (`/retrieve`)

**Stepper:** Glass pill tabs — Source → Components → Review → Execute

**Step 1 — Source Org:**
- Glass dropdown to select source org
- Auth health check indicator (green dot when healthy)

**Step 2 — Choose Components:**
- Mode toggle: "All Changes" vs "Cherry Pick" (glass pill toggle)
- MetadataTree component in a glass container:
  - Glass search bar at top with focus glow
  - "Recently Modified" filter as glass toggle
  - Category accordions with glass headers (sticky on scroll)
  - Component rows with checkbox, name (search highlight in purple), type badge, last modified date
  - Virtual scrolling (RecycleScroller) for categories with 30+ items
  - Bundle save/load functionality

**Step 3 — Review:**
- Glass summary card: source org, mode, component count
- Retrieve name input (glass input with label)
- Component list preview (collapsible)

**Step 4 — Execute:**
- Progress tracker in glass container
- Per-component status indicators (green check / red x / spinner)
- Collapsible log panel (glass, monospace text)
- Completion state: success card with "Deploy These" button linking to Deploy page

### 4. Deploy Page (`/deploy`)

**Stepper:** Glass pill tabs — Source → Components → Target → Validate → Deploy

**Step 1 — Source:**
- Glass card options: "From Previous Retrieve" or "From Live Org"
- If previous retrieve: glass list of available retrieves with name, date, component count
- If live org: org selector dropdown

**Step 2 — Components:**
- Component selection (same MetadataTree as Retrieve)
- Auto-populated if coming from retrieve via query params
- Selected count badge

**Step 3 — Target Org:**
- Glass dropdown for target org selection
- Health check before proceeding
- Production org warning: glass card with amber border + warning icon

**Step 4 — Validate (mandatory):**
- "Run Validation" button (purple gradient)
- Validation results in glass card:
  - Success: green header, component count
  - Failure: red header, failed components with error details
  - Per-component breakdown table (glass table)

**Step 5 — Deploy:**
- Progress tracker (same as Retrieve step 4)
- Completion state: success/failure card
- Post-deploy actions: "View in History" (success), "Retry" / "View Errors" (failure)

### 5. History Page (`/history`)

**Layout:**
- Page header: "Deployment History" title
- **Filters row:** Glass pill toggles for:
  - Status: All / Passed / Failed
  - Date range: 7d / 30d / 90d / Custom
  - User filter (if team usage)
- **History table** (glass table):
  - Glass header row (sticky)
  - Columns: Status icon, Operation type, Name, Org, Component count, Duration, Timestamp
  - Expandable rows → glass detail panel:
    - Operation ID, full timestamps
    - Component list with individual status
    - Error details for failures (failed component breakdown)
  - Production org highlighting (purple left border instead of current orange)
- **Row actions:** Rollback button (with ConfirmModal)

## Shared Components

### GlassCard
Base surface component. Props: `hover` (boolean for hover glow), `glow` (boolean for ambient glow), `padding` (sm/md/lg).

### GlassPillStepper
Wizard navigation. Props: `steps` (array of {label, key}), `currentStep` (key), `completedSteps` (array of keys). Emits: `step-click`.

### GlassModal
Dialog overlay. Props: `show`, `title`, `maxWidth`. Glass panel centered over blurred backdrop. Slots: default, footer.

### GlassDropdown
Select component. Props: `options`, `modelValue`, `placeholder`. Glass trigger + glass dropdown panel.

### GlassInput
Text input. Props: standard input props. Glass background with inner glow on focus, purple border on focus.

### GlassButton
Button variants. Props: `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg). Primary = purple gradient, Secondary = glass, Ghost = transparent, Danger = red tint glass.

### GlassTable
Data table. Props: `columns`, `rows`, `expandable`. Glass header, subtle row borders, hover highlight.

### GlassBadge
Status/type badge. Props: `variant` (success/error/warning/info/purple), `size` (sm/md). Glass pill with color tint.

### GlassToggle
Segmented control. Props: `options`, `modelValue`. Glass container with sliding active indicator.

### MetadataTree (redesigned)
Existing functionality, restyled with glass theme. Search bar, category accordions, virtual scrolling, checkboxes, all in glass.

### ProgressTracker (redesigned)
Existing functionality, restyled. Glass container, animated progress, per-component dots, collapsible log.

### Toast (redesigned)
Glass pill notifications. Success = green-tinted glass, Error = red-tinted glass. Bottom-right stack.

### ConfirmModal (redesigned)
Uses GlassModal. Adds typed confirmation for dangerous actions (e.g., removing an org).

### ConnectOrgModal (redesigned)
Uses GlassModal. Multi-step: form → waiting → result. Custom domain support.

### OrgCard (redesigned)
Uses GlassCard. Shows org info with type badge, status dot, action buttons.

## CSS Architecture

All glass design tokens defined in `client/src/assets/main.css` as CSS custom properties. Tailwind utility classes used for layout. Glass recipe applied via a shared `.glass` utility class and component-specific variants.

No component-scoped `<style>` blocks except for transitions/animations. All theming flows through CSS variables for future light-mode support.

## What Does NOT Change

- **Backend:** All API routes, WebSocket events, services, and caching remain identical
- **Composables:** `useApi`, `useOrgs`, `useMetadata`, `useWebSocket`, `useToast` — logic stays the same, only template/style changes in consuming components
- **Router structure:** Same Vue Router setup, just adding `/` route for Dashboard
- **Virtual scrolling:** Already implemented with `vue-virtual-scroller`
- **Functionality:** All existing features (connect, retrieve, deploy, validate, rollback, history, search, bundles) preserved exactly

## Migration Strategy

Component-by-component replacement. Create new glass components alongside existing ones, swap them in page by page. This allows incremental testing rather than a big-bang rewrite.

Order:
1. Theme foundation: CSS variables, glass utility classes, base background
2. Shared glass components: GlassCard, GlassButton, GlassInput, GlassBadge, GlassModal, GlassDropdown, GlassTable, GlassToggle, GlassPillStepper
3. Layout shell: TopNavBar replacing Sidebar, App.vue restructure
4. Dashboard page (new)
5. Orgs page redesign (including OrgCard, ConnectOrgModal)
6. Retrieve page redesign (including MetadataTree, ProgressTracker)
7. Deploy page redesign
8. History page redesign
9. Toast redesign
10. Cleanup: remove old components, old CSS variables
