# Pushly Landing Page — Learning-by-Building Roadmap

> **This is a self-paced learning plan.** Each task teaches one concept by building one piece of the Pushly landing page. Tasks build on each other — do them in order. By the end, you'll have a deployed landing page AND understand Vue 3, Tailwind CSS, and modern frontend development.

**Goal:** Build and deploy the Pushly landing page (pushly.dev) while learning HTML/CSS, Tailwind CSS v4, and Vue 3 from scratch.

**What you're building:** A single-page marketing site with: hero section, pain point cards, "how it works" steps, features grid, "who is Pushly for?" section, cloud waitlist email capture, and footer.

**Design reference:** Dark theme matching the Pushly app. See `client/src/assets/main.css` for the color variables.

**Time estimate:** 5-7 weeks at 10-15 hrs/week.

---

## Track 1: HTML + CSS Foundations (1-2 weeks)

**Goal:** Build a complete static version of the landing page using only HTML and CSS. No frameworks, no JavaScript. Just a single `index.html` file you open in your browser.

**Setup:** Create a new folder for this work:
```bash
mkdir -p ~/Documents/Development/pushly-site/track1
cd ~/Documents/Development/pushly-site/track1
touch index.html style.css
```

Open `index.html` in your browser as you work — just refresh to see changes.

---

### Task 1.1: Build a centered box

**What you're learning:** The CSS box model (how every element is a box with content, padding, border, margin), background colors, and text alignment.

**Build this:**
A full-screen dark container with white centered text that says "Pushly" in large letters and "Deploy Salesforce metadata without touching the terminal" below it.

**Steps:**

- [ ] Create `index.html` with this starter:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pushly</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="hero">
    <h1>Pushly</h1>
    <p>Deploy Salesforce metadata without touching the terminal</p>
  </div>
</body>
</html>
```

- [ ] Create `style.css` — make the hero box fill the screen with a dark background:
```css
/* Reset default margins */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #0f0f1a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.25rem;
  color: #a0a0b0;
}
```

- [ ] Open `index.html` in your browser. You should see centered white text on a dark background.

**What to notice:**
- `box-sizing: border-box` makes padding go inside the box, not outside
- `min-height: 100vh` means "at least the full viewport height"
- `display: flex` with `justify-content: center` and `align-items: center` is the modern way to center things
- `rem` units scale with the browser's base font size (usually 16px)

---

### Task 1.2: Build the full hero section with buttons

**What you're learning:** Flexbox for horizontal layout, padding/margin spacing, button styling, and the CSS cascade.

**Build this:**
Add two buttons side by side below the subtitle: "Get Started — GitHub" (primary, purple) and "Watch Demo" (secondary, outlined).

**Steps:**

- [ ] Add buttons to the hero in `index.html`:
```html
<div class="hero">
  <h1>Pushly</h1>
  <p>Deploy Salesforce metadata without touching the terminal</p>
  <p class="subtitle">Free, open source, built for admin teams</p>
  <div class="hero-buttons">
    <a href="#" class="btn btn-primary">Get Started — GitHub</a>
    <a href="#waitlist" class="btn btn-secondary">Join Cloud Waitlist</a>
  </div>
</div>
```

- [ ] Add button styles to `style.css`:
```css
.subtitle {
  font-size: 1rem;
  color: #a0a0b0;
  margin-top: 0.5rem;
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #6366f1;
  color: white;
  border: 2px solid #6366f1;
}

.btn-primary:hover {
  background-color: #5558e6;
}

.btn-secondary {
  background-color: transparent;
  color: #6366f1;
  border: 2px solid #6366f1;
}

.btn-secondary:hover {
  background-color: #6366f1;
  color: white;
}
```

- [ ] Refresh browser. Two buttons should sit side by side, centered under the text.

**What to notice:**
- `display: flex` on the parent + `gap: 1rem` gives even spacing between buttons without margin hacks
- `transition: all 0.2s` makes hover effects smooth instead of instant
- The `:hover` pseudo-class only activates when the mouse is over the element

---

### Task 1.3: Build the pain points section (3-column cards)

**What you're learning:** CSS Grid for multi-column layouts, card styling with borders/shadows/rounded corners.

**Build this:**
A section below the hero with 3 cards side by side: "Change Sets are slow", "The CLI is intimidating", "Enterprise tools cost $200+/user/mo".

**Steps:**

- [ ] Add this HTML after the hero `</div>`:
```html
<section class="pain-points">
  <h2>Sound familiar?</h2>
  <div class="cards">
    <div class="card">
      <div class="card-icon">⏳</div>
      <h3>Change Sets are slow</h3>
      <p>Loading metadata takes forever. Search doesn't work. No validation before you deploy.</p>
    </div>
    <div class="card">
      <div class="card-icon">💻</div>
      <h3>The CLI is intimidating</h3>
      <p>Your team builds in Salesforce, not in the terminal. Learning sf commands shouldn't be required.</p>
    </div>
    <div class="card">
      <div class="card-icon">💸</div>
      <h3>Enterprise tools cost too much</h3>
      <p>$200+/user/month for Gearset or Copado. Your team just needs reliable deployments.</p>
    </div>
  </div>
</section>
```

- [ ] Add these styles:
```css
section {
  padding: 4rem 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

section h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  background-color: #1e1e2e;
  border: 1px solid #2a2a3d;
  border-radius: 0.75rem;
  padding: 2rem;
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.card h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.card p {
  color: #a0a0b0;
  line-height: 1.6;
}
```

- [ ] Refresh. Three cards should appear in a row below the hero.

**What to notice:**
- `grid-template-columns: repeat(3, 1fr)` creates 3 equal-width columns
- `1fr` means "1 fraction of available space" — they split evenly
- `max-width: 1100px` + `margin: 0 auto` centers the section with a max width

---

### Task 1.4: Make it responsive

**What you're learning:** Media queries — CSS rules that only apply at certain screen sizes.

**Build this:**
On screens narrower than 768px, the 3 cards should stack vertically (1 column) and the hero buttons should stack too.

**Steps:**

- [ ] Add a media query at the bottom of `style.css`:
```css
@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem;
  }

  .hero-buttons {
    flex-direction: column;
    align-items: center;
  }

  .cards {
    grid-template-columns: 1fr;
  }
}
```

- [ ] Resize your browser window narrow and wide. The layout should adapt.

**What to notice:**
- `@media (max-width: 768px)` means "apply these styles when the viewport is 768px or narrower"
- `flex-direction: column` makes flex items stack vertically instead of horizontally
- `grid-template-columns: 1fr` overrides the 3-column grid to a single column
- 768px is a common breakpoint — roughly the width of a tablet in portrait mode

---

### Task 1.5: Build the features grid and "Who is this for?" section

**What you're learning:** Reusing grid patterns, section layout rhythm.

**Steps:**

- [ ] Add this HTML after the pain-points section:
```html
<section class="features">
  <h2>Everything you need to deploy with confidence</h2>
  <div class="feature-grid">
    <div class="feature">
      <h3>🧙 Wizard-based deploy</h3>
      <p>Step-by-step flows guide you from retrieve to deploy</p>
    </div>
    <div class="feature">
      <h3>🔍 Searchable metadata</h3>
      <p>Find components instantly across all categories</p>
    </div>
    <div class="feature">
      <h3>✅ Validate first</h3>
      <p>Dry-run every deployment before it touches production</p>
    </div>
    <div class="feature">
      <h3>⏪ One-click rollback</h3>
      <p>Pre-deploy snapshots let you revert if something breaks</p>
    </div>
    <div class="feature">
      <h3>📋 Team history</h3>
      <p>Everyone sees who deployed what, when</p>
    </div>
    <div class="feature">
      <h3>💬 Plain-English errors</h3>
      <p>Salesforce error codes translated to actionable messages</p>
    </div>
  </div>
</section>

<section class="who-is-it-for">
  <h2>Who is Pushly for?</h2>
  <div class="persona-card">
    <p>Admin teams who build in Salesforce but don't live in the terminal. Teams that need reliable deployments without a $20K/year DevOps platform. If you're using Change Sets and wishing there was something better — Pushly is for you.</p>
  </div>
</section>
```

- [ ] Add styles:
```css
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.feature {
  background-color: #1e1e2e;
  border: 1px solid #2a2a3d;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.feature h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.feature p {
  color: #a0a0b0;
  font-size: 0.95rem;
  line-height: 1.5;
}

.persona-card {
  background: linear-gradient(135deg, #1e1e2e 0%, #252536 100%);
  border: 1px solid #6366f1;
  border-radius: 0.75rem;
  padding: 2rem;
  max-width: 700px;
  margin: 0 auto;
}

.persona-card p {
  color: #c0c0d0;
  line-height: 1.8;
  font-size: 1.1rem;
  text-align: center;
}

/* Update the media query to handle the feature grid too */
@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] Refresh. You should see a 6-item feature grid and a highlighted persona card.

---

### Task 1.6: Build the waitlist form

**What you're learning:** HTML form elements, input styling, focus states.

**Steps:**

- [ ] Add this HTML after the "who is it for" section:
```html
<section class="waitlist" id="waitlist">
  <h2>Pushly Cloud is coming</h2>
  <p class="waitlist-subtitle">Zero setup. Connect your orgs from any browser. Get notified when it launches.</p>
  <form class="waitlist-form">
    <input type="email" placeholder="your@email.com" class="email-input" required>
    <button type="submit" class="btn btn-primary">Notify Me</button>
  </form>
</section>
```

- [ ] Add styles:
```css
.waitlist {
  text-align: center;
}

.waitlist-subtitle {
  color: #a0a0b0;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.waitlist-form {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  max-width: 500px;
  margin: 0 auto;
}

.email-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 2px solid #2a2a3d;
  background-color: #1e1e2e;
  color: white;
  font-size: 1rem;
}

.email-input:focus {
  outline: none;
  border-color: #6366f1;
}

.email-input::placeholder {
  color: #666;
}

@media (max-width: 768px) {
  .waitlist-form {
    flex-direction: column;
  }
}
```

- [ ] Refresh. Click into the email input — the border should turn purple on focus.

**What to notice:**
- `flex: 1` on the input makes it take all available space (the button keeps its natural size)
- `:focus` styles the element when it's actively selected (clicked/tabbed into)
- `::placeholder` styles the ghost text inside the input

---

### Task 1.7: Assemble the full page with footer and consistent spacing

**What you're learning:** Page-level layout, CSS variables for theming, footer patterns.

**Steps:**

- [ ] Add a footer at the bottom:
```html
<footer class="footer">
  <p>
    <a href="#">GitHub</a> ·
    <a href="#">Elastic License 2.0</a> ·
    Built with ☕ for Salesforce admins
  </p>
</footer>
```

- [ ] Add CSS variables at the top of `style.css` (replace the existing `body` styles):
```css
:root {
  --bg-base: #0f0f1a;
  --bg-surface: #1e1e2e;
  --bg-elevated: #252536;
  --border: #2a2a3d;
  --text-primary: #ffffff;
  --text-secondary: #c0c0d0;
  --text-muted: #a0a0b0;
  --accent: #6366f1;
  --accent-hover: #5558e6;
}

body {
  background-color: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

- [ ] Replace all hardcoded colors with variables (e.g., `#1e1e2e` → `var(--bg-surface)`, `#6366f1` → `var(--accent)`, `#a0a0b0` → `var(--text-muted)`).

- [ ] Add footer styles:
```css
.footer {
  text-align: center;
  padding: 2rem;
  border-top: 1px solid var(--border);
  margin-top: 4rem;
}

.footer a {
  color: var(--accent);
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
```

- [ ] Refresh. Scroll the full page top to bottom. Every section should have consistent spacing and colors.

**What to notice:**
- CSS variables (`--name`) defined in `:root` are available everywhere — change one value, the whole site updates
- This is the same color system the Pushly app uses (check `client/src/assets/main.css`)
- Consistent `padding: 4rem 2rem` on sections creates rhythm

**Congratulations — Track 1 complete!** You have a full static landing page. Save this file — you'll rebuild it with Tailwind next.

---

## Track 2: Tailwind CSS v4 (3-5 days)

**Goal:** Rebuild the same page using Tailwind CSS utility classes instead of custom CSS. This teaches you the system the Pushly app uses.

**Setup:** Create a new Vite project with Tailwind:
```bash
cd ~/Documents/Development/pushly-site
npm create vite@latest track2 -- --template vanilla
cd track2
npm install
npm install tailwindcss @tailwindcss/vite
```

Then update `vite.config.js`:
```js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()]
})
```

And add this to the top of `style.css`:
```css
@import "tailwindcss";
```

Run: `npm run dev` — Vite serves at `http://localhost:5173`.

**Important:** Tailwind CSS v4 does NOT use `tailwind.config.js`. Configuration is done with `@theme` in your CSS file. Most tutorials online are for v3 — ignore their config file instructions.

---

### Task 2.1: Rebuild the hero with Tailwind classes

**What you're learning:** Utility-first CSS — instead of writing `.hero { display: flex; }`, you put `class="flex"` directly on the element.

**Steps:**

- [ ] Replace the content of `index.html` with:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pushly</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="bg-[#0f0f1a] text-white font-sans">

  <section class="min-h-screen flex flex-col justify-center items-center text-center px-8">
    <h1 class="text-5xl font-bold mb-4">Pushly</h1>
    <p class="text-xl text-gray-400">Deploy Salesforce metadata without touching the terminal</p>
    <p class="text-gray-400 mt-2 mb-8">Free, open source, built for admin teams</p>
    <div class="flex gap-4">
      <a href="#" class="px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg border-2 border-indigo-500 hover:bg-indigo-600 transition">
        Get Started — GitHub
      </a>
      <a href="#waitlist" class="px-6 py-3 text-indigo-400 font-semibold rounded-lg border-2 border-indigo-500 hover:bg-indigo-500 hover:text-white transition">
        Join Cloud Waitlist
      </a>
    </div>
  </section>

</body>
</html>
```

- [ ] Refresh. The hero should look identical to your Track 1 version — but you wrote zero custom CSS.

**What to notice:**
- `min-h-screen` = `min-height: 100vh`
- `flex flex-col justify-center items-center` = the centering pattern from Track 1
- `text-5xl` = `font-size: 3rem`
- `mb-4` = `margin-bottom: 1rem` (Tailwind uses a 4px base: 4 × 4 = 16px = 1rem)
- `hover:bg-indigo-600` = apply on hover only
- `transition` = `transition: all 0.15s`
- `bg-[#0f0f1a]` = arbitrary value (use any hex color with square bracket syntax)

---

### Task 2.2: Rebuild the cards with responsive grid

**What you're learning:** Tailwind's responsive prefixes (`md:`, `lg:`) and grid utilities.

**Steps:**

- [ ] Add the pain points section after the hero `</section>`:
```html
<section class="max-w-5xl mx-auto px-8 py-16">
  <h2 class="text-3xl font-bold text-center mb-8">Sound familiar?</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

    <div class="bg-[#1e1e2e] border border-[#2a2a3d] rounded-xl p-8">
      <div class="text-3xl mb-4">⏳</div>
      <h3 class="text-lg font-semibold mb-2">Change Sets are slow</h3>
      <p class="text-gray-400 leading-relaxed">Loading metadata takes forever. Search doesn't work. No validation before you deploy.</p>
    </div>

    <div class="bg-[#1e1e2e] border border-[#2a2a3d] rounded-xl p-8">
      <div class="text-3xl mb-4">💻</div>
      <h3 class="text-lg font-semibold mb-2">The CLI is intimidating</h3>
      <p class="text-gray-400 leading-relaxed">Your team builds in Salesforce, not in the terminal. Learning sf commands shouldn't be required.</p>
    </div>

    <div class="bg-[#1e1e2e] border border-[#2a2a3d] rounded-xl p-8">
      <div class="text-3xl mb-4">💸</div>
      <h3 class="text-lg font-semibold mb-2">Enterprise tools cost too much</h3>
      <p class="text-gray-400 leading-relaxed">$200+/user/month for enterprise DevOps. Your team just needs reliable deployments.</p>
    </div>

  </div>
</section>
```

- [ ] Resize your browser. Below 768px (the `md:` breakpoint), cards stack to 1 column automatically.

**What to notice:**
- `grid-cols-1 md:grid-cols-3` means: 1 column by default, 3 columns at medium screens and up
- Tailwind is **mobile-first** — the unprefixed class is the mobile style, `md:` adds the desktop override
- This is the opposite of your Track 1 media query (which was desktop-first, with a max-width override)

---

### Task 2.3: Add hover effects and transitions

**What you're learning:** Tailwind's state modifiers and transition utilities.

**Steps:**

- [ ] Update each card div to add hover effects:
```html
<div class="bg-[#1e1e2e] border border-[#2a2a3d] rounded-xl p-8 transition hover:border-indigo-500 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-indigo-500/10">
```

- [ ] Hover over each card. It should lift slightly, get a purple border, and show a subtle shadow.

**What to notice:**
- `hover:translate-y-[-2px]` lifts the card 2px on hover
- `hover:shadow-indigo-500/10` adds a purple-tinted shadow at 10% opacity
- All transitions are smooth because of the `transition` class
- Stacking multiple `hover:` classes is how you compose complex hover effects in Tailwind

---

### Task 2.4: Apply dark theme with @theme

**What you're learning:** Tailwind v4's `@theme` directive for custom design tokens.

**Steps:**

- [ ] Update `style.css` to define custom theme colors:
```css
@import "tailwindcss";

@theme {
  --color-base: #0f0f1a;
  --color-surface: #1e1e2e;
  --color-elevated: #252536;
  --color-border: #2a2a3d;
  --color-accent: #6366f1;
  --color-accent-hover: #5558e6;
  --color-muted: #a0a0b0;
}
```

- [ ] Now replace arbitrary values in your HTML with theme colors:
  - `bg-[#0f0f1a]` → `bg-base`
  - `bg-[#1e1e2e]` → `bg-surface`
  - `border-[#2a2a3d]` → `border-border`
  - `text-gray-400` → `text-muted` (where appropriate)

- [ ] Verify the page looks the same.

**What to notice:**
- `@theme` in v4 replaces `tailwind.config.js` from v3
- Colors defined in `@theme` become usable as `bg-{name}`, `text-{name}`, `border-{name}`
- This is the same pattern the Pushly app uses — consistent design tokens

**Congratulations — Track 2 complete!** You now understand Tailwind's utility-first approach. The same classes you just learned are what the Pushly app uses.

---

## Track 3: Vue 3 Fundamentals (1-2 weeks)

**Goal:** Convert the static Tailwind page into a Vue 3 app with real interactivity — components, reactivity, and a working email waitlist.

---

### Task 3.1: Create a Vue 3 + Vite project

**What you're learning:** How a Vue project is structured, what Vite does, the dev server.

**Steps:**

- [ ] Create the project:
```bash
cd ~/Documents/Development/pushly-site
npm create vue@latest track3
```
When prompted:
- Project name: `track3`
- TypeScript: **No**
- JSX: **No**
- Router: **No**
- Pinia: **No**
- Vitest: **No**
- E2E: **No**
- ESLint: **No**
- Prettier: **No**

- [ ] Install and add Tailwind:
```bash
cd track3
npm install
npm install tailwindcss @tailwindcss/vite
```

- [ ] Update `vite.config.js`:
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()]
})
```

- [ ] Replace `src/assets/main.css` with:
```css
@import "tailwindcss";

@theme {
  --color-base: #0f0f1a;
  --color-surface: #1e1e2e;
  --color-elevated: #252536;
  --color-border: #2a2a3d;
  --color-accent: #6366f1;
  --color-accent-hover: #5558e6;
  --color-muted: #a0a0b0;
}
```

- [ ] Replace `src/App.vue` with:
```vue
<template>
  <div class="bg-base text-white min-h-screen font-sans">
    <h1 class="text-4xl text-center pt-20">Hello from Vue + Tailwind!</h1>
  </div>
</template>
```

- [ ] Run it:
```bash
npm run dev
```

- [ ] Open `http://localhost:5173`. You should see "Hello from Vue + Tailwind!" on a dark background.

**What to notice:**
- `src/App.vue` is the root component — everything starts here
- A `.vue` file has `<template>` (HTML), `<script>` (JS), and optionally `<style>` (CSS)
- Vite auto-refreshes when you save — no manual refresh needed

---

### Task 3.2: Create HeroSection.vue

**What you're learning:** Single File Components — the building blocks of Vue apps.

**Steps:**

- [ ] Create `src/components/HeroSection.vue`:
```vue
<template>
  <section class="min-h-screen flex flex-col justify-center items-center text-center px-8">
    <h1 class="text-5xl font-bold mb-4">Pushly</h1>
    <p class="text-xl text-muted">Deploy Salesforce metadata without touching the terminal</p>
    <p class="text-muted mt-2 mb-8">Free, open source, built for admin teams</p>
    <div class="flex gap-4 flex-col sm:flex-row">
      <a href="#" class="px-6 py-3 bg-accent text-white font-semibold rounded-lg border-2 border-accent hover:bg-accent-hover transition">
        Get Started — GitHub
      </a>
      <a href="#waitlist" class="px-6 py-3 text-accent font-semibold rounded-lg border-2 border-accent hover:bg-accent hover:text-white transition">
        Join Cloud Waitlist
      </a>
    </div>
  </section>
</template>
```

- [ ] Update `src/App.vue` to use it:
```vue
<script setup>
import HeroSection from './components/HeroSection.vue'
</script>

<template>
  <div class="bg-base text-white min-h-screen font-sans">
    <HeroSection />
  </div>
</template>
```

- [ ] Save both files. The browser should show the full hero section.

**What to notice:**
- `import ... from './components/HeroSection.vue'` loads the component
- `<HeroSection />` renders it — it's like a custom HTML tag
- `<script setup>` is Vue 3's shorthand — anything you import is automatically available in the template

---

### Task 3.3: Create all section components

**What you're learning:** Component composition — breaking a page into reusable pieces.

**Steps:**

- [ ] Create these component files using the HTML from your Track 2 work:
  - `src/components/PainPoints.vue` — the 3 cards
  - `src/components/Features.vue` — the 6-item feature grid
  - `src/components/WhoIsItFor.vue` — the persona card
  - `src/components/WaitlistForm.vue` — just the section wrapper and heading for now (we'll add interactivity next)
  - `src/components/SiteFooter.vue` — the footer

Each file follows the same pattern:
```vue
<template>
  <section class="...">
    <!-- Your HTML from Track 2 here -->
  </section>
</template>
```

- [ ] Update `App.vue` to compose them all:
```vue
<script setup>
import HeroSection from './components/HeroSection.vue'
import PainPoints from './components/PainPoints.vue'
import Features from './components/Features.vue'
import WhoIsItFor from './components/WhoIsItFor.vue'
import WaitlistForm from './components/WaitlistForm.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>

<template>
  <div class="bg-base text-white min-h-screen font-sans">
    <HeroSection />
    <PainPoints />
    <Features />
    <WhoIsItFor />
    <WaitlistForm />
    <SiteFooter />
  </div>
</template>
```

- [ ] The full page should render — identical to Track 2, but now as organized components.

---

### Task 3.4: Make the email input reactive

**What you're learning:** Vue's reactivity system — `ref()` creates reactive data, `v-model` binds it to inputs, `{{ }}` displays it.

**Steps:**

- [ ] Update `src/components/WaitlistForm.vue`:
```vue
<script setup>
import { ref } from 'vue'

const email = ref('')
</script>

<template>
  <section id="waitlist" class="max-w-5xl mx-auto px-8 py-16 text-center">
    <h2 class="text-3xl font-bold mb-4">Pushly Cloud is coming</h2>
    <p class="text-muted mb-8 text-lg">Zero setup. Connect your orgs from any browser.</p>

    <form class="flex gap-3 justify-center max-w-md mx-auto flex-col sm:flex-row">
      <input
        v-model="email"
        type="email"
        placeholder="your@email.com"
        class="flex-1 px-4 py-3 rounded-lg border-2 border-border bg-surface text-white focus:outline-none focus:border-accent"
      />
      <button type="submit" class="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-hover transition">
        Notify Me
      </button>
    </form>

    <p class="mt-4 text-sm text-muted">
      You typed: <span class="text-accent">{{ email }}</span>
    </p>
  </section>
</template>
```

- [ ] Type in the email input. The text below should update in real-time as you type.

**What to notice:**
- `ref('')` creates a reactive variable starting as an empty string
- `v-model="email"` two-way binds the input to that variable — when you type, `email` updates; if you change `email` in code, the input updates
- `{{ email }}` renders the current value in the template — it auto-updates when `email` changes
- This is **reactivity** — Vue tracks which variables the template uses and re-renders only what changed

---

### Task 3.5: Add email validation

**What you're learning:** `computed()` for derived values, conditional CSS classes with `:class`, `v-bind`.

**Steps:**

- [ ] Update the script in `WaitlistForm.vue`:
```vue
<script setup>
import { ref, computed } from 'vue'

const email = ref('')

const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})
</script>
```

- [ ] Update the button to disable when invalid:
```html
<button
  type="submit"
  :disabled="!isValidEmail"
  :class="[
    'px-6 py-3 font-semibold rounded-lg transition',
    isValidEmail
      ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer'
      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
  ]"
>
  Notify Me
</button>
```

- [ ] Remove the "You typed" debug line. Replace with:
```html
<p v-if="email && !isValidEmail" class="mt-4 text-sm text-red-400">
  Please enter a valid email address
</p>
```

- [ ] Test: type "abc" — button should be gray and disabled. Type "abc@test.com" — button turns purple and is clickable.

**What to notice:**
- `computed()` creates a value that auto-recalculates when its dependencies change
- `isValidEmail` recalculates every time `email.value` changes — you never call it manually
- `:disabled` is shorthand for `v-bind:disabled` — binds a JS expression to an HTML attribute
- `:class` with an array lets you conditionally apply different classes
- `v-if` conditionally renders an element — it's removed from the DOM entirely when false

---

### Task 3.6: Submit to Supabase

**What you're learning:** async/await, fetch API, calling external services, conditional rendering with `v-if`/`v-else`.

**Prerequisites:** Create a Supabase project at https://supabase.com (free tier). Then:
1. Create a table called `waitlist` with columns: `id` (int8, auto), `email` (text, unique), `created_at` (timestamptz, default now())
2. Enable Row Level Security (RLS) on the table
3. Add an RLS policy: allow INSERT for anon role, deny everything else
4. Copy your project URL and anon key from Settings → API

**Steps:**

- [ ] Update `WaitlistForm.vue`:
```vue
<script setup>
import { ref, computed } from 'vue'

const email = ref('')
const submitted = ref(false)
const loading = ref(false)
const error = ref('')

const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

async function handleSubmit() {
  if (!isValidEmail.value || loading.value) return

  loading.value = true
  error.value = ''

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ email: email.value })
    })

    if (response.status === 409 || response.status === 23505) {
      submitted.value = true
      return
    }

    if (!response.ok) {
      const data = await response.json()
      if (data?.message?.includes('duplicate')) {
        submitted.value = true
        return
      }
      throw new Error(data?.message || 'Something went wrong')
    }

    submitted.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section id="waitlist" class="max-w-5xl mx-auto px-8 py-16 text-center">
    <h2 class="text-3xl font-bold mb-4">Pushly Cloud is coming</h2>
    <p class="text-muted mb-8 text-lg">Zero setup. Connect your orgs from any browser.</p>

    <div v-if="submitted" class="text-green-400 text-lg">
      ✓ You're on the list! We'll email you when Pushly Cloud launches.
    </div>

    <form v-else @submit.prevent="handleSubmit" class="flex gap-3 justify-center max-w-md mx-auto flex-col sm:flex-row">
      <input
        v-model="email"
        type="email"
        placeholder="your@email.com"
        class="flex-1 px-4 py-3 rounded-lg border-2 border-border bg-surface text-white focus:outline-none focus:border-accent"
      />
      <button
        type="submit"
        :disabled="!isValidEmail || loading"
        :class="[
          'px-6 py-3 font-semibold rounded-lg transition',
          isValidEmail && !loading
            ? 'bg-accent text-white hover:bg-accent-hover cursor-pointer'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        ]"
      >
        {{ loading ? 'Sending...' : 'Notify Me' }}
      </button>
    </form>

    <p v-if="error" class="mt-4 text-sm text-red-400">{{ error }}</p>
    <p v-else-if="email && !isValidEmail && !submitted" class="mt-4 text-sm text-red-400">
      Please enter a valid email address
    </p>
  </section>
</template>
```

- [ ] Replace `YOUR_SUPABASE_URL` and `YOUR_ANON_KEY` with your actual values.

- [ ] Test: enter a valid email and click "Notify Me". You should see the success message. Check your Supabase table — the email should be there.

**What to notice:**
- `@submit.prevent` is `v-on:submit` + `event.preventDefault()` — stops the form from reloading the page
- `async/await` makes the fetch call readable — `await` pauses until the response comes back
- `v-if` / `v-else` swap between the form and the success message — only one renders at a time
- `{{ loading ? 'Sending...' : 'Notify Me' }}` is a ternary in the template — changes button text during submission
- **Move the keys to environment variables before deploying** — see Task 3.7

---

### Task 3.7: Deploy to Vercel

**What you're learning:** Building for production, environment variables, deployment.

**Steps:**

- [ ] Move Supabase keys to environment variables. Create `.env`:
```
VITE_SUPABASE_URL=your_actual_url
VITE_SUPABASE_ANON_KEY=your_actual_key
```

- [ ] Update `WaitlistForm.vue` to use env vars:
```js
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
```

- [ ] Add `.env` to `.gitignore`.

- [ ] Test locally: `npm run dev` — the form should still work.

- [ ] Build for production:
```bash
npm run build
```
This creates a `dist/` folder with static files.

- [ ] Deploy to Vercel:
```bash
npm install -g vercel
vercel
```
Follow the prompts. When asked for environment variables, add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

- [ ] Visit the URL Vercel gives you. Your landing page is live!

- [ ] (Optional) Connect a custom domain in the Vercel dashboard — pushly.dev, pushly.io, or whatever you've registered.

**Congratulations — Track 3 complete!** You've built and deployed a Vue 3 + Tailwind CSS landing page with a working email waitlist. You understand components, reactivity, computed values, API calls, and deployment.

---

## Optional: Polish Track (after launch)

Only do these after the site is live. Ship first, polish later.

### Task P.1: Smooth scroll for anchor links

```js
// In HeroSection.vue, update the waitlist link:
<a
  href="#waitlist"
  @click.prevent="document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' })"
>
```

### Task P.2: Scroll-triggered fade-in

```vue
<!-- Create src/composables/useReveal.js -->
<script>
import { ref, onMounted } from 'vue'

export function useReveal() {
  const el = ref(null)
  const visible = ref(false)

  onMounted(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true
        observer.disconnect()
      }
    }, { threshold: 0.1 })
    if (el.value) observer.observe(el.value)
  })

  return { el, visible }
}
</script>

<!-- Use in any section component: -->
<script setup>
import { useReveal } from '../composables/useReveal.js'
const { el, visible } = useReveal()
</script>

<template>
  <section
    ref="el"
    :class="['transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8']"
  >
    ...
  </section>
</template>
```

### Task P.3: Record a demo GIF

Use a screen recorder (macOS: Cmd+Shift+5, or use [Kap](https://getkap.co/) for GIF export) to record a 15-second flow:
1. Open Pushly
2. Connect an org
3. Browse metadata tree
4. Start a deploy with validation

Save as `docs/screenshots/deploy-flow.gif` in the Pushly repo. Update the README to point to it.

---

## Timeline Summary

| Track | What you build | What you learn | Time |
|---|---|---|---|
| Track 1 | Static HTML/CSS landing page | Box model, flexbox, grid, media queries, CSS variables | 1-2 weeks |
| Track 2 | Same page rebuilt with Tailwind | Utility classes, responsive prefixes, @theme, hover states | 3-5 days |
| Track 3 | Vue 3 app with working waitlist | Components, reactivity, computed, API calls, deployment | 1-2 weeks |
| Polish | Animations, demo GIF | IntersectionObserver, composables, screen recording | A few hours |
| **Total** | **Deployed landing page at pushly.dev** | **Full modern frontend stack** | **3-5 weeks** |
