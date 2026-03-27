# SF Deploy Kit — Full UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the entire SF Deploy Kit frontend with glassmorphism dark theme, top navigation bar, glass pill wizard steppers, and a new Dashboard home page.

**Architecture:** Pure frontend redesign — no backend changes. Replace the current sidebar layout with a top nav bar, replace the old dark theme CSS variables with glassmorphism tokens, create reusable glass base components, then restyle each page. Component-by-component migration with old components removed in a final cleanup task.

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Tailwind CSS v4, CSS custom properties, `vue-virtual-scroller`

**Spec:** `docs/superpowers/specs/2026-03-27-ui-redesign-design.md`

---

## File Structure

### New files to create:
- `client/src/assets/main.css` — **Rewrite:** new glass theme tokens replacing old dark theme
- `client/src/components/glass/GlassCard.vue` — Base glass surface component
- `client/src/components/glass/GlassButton.vue` — Button with primary/secondary/ghost/danger variants
- `client/src/components/glass/GlassInput.vue` — Text input with glass styling
- `client/src/components/glass/GlassBadge.vue` — Status/type pill badge
- `client/src/components/glass/GlassModal.vue` — Dialog overlay with glass panel
- `client/src/components/glass/GlassDropdown.vue` — Select with glass styling
- `client/src/components/glass/GlassTable.vue` — Data table with glass header
- `client/src/components/glass/GlassToggle.vue` — Segmented control toggle
- `client/src/components/glass/GlassPillStepper.vue` — Wizard step navigation
- `client/src/components/TopNavBar.vue` — Horizontal top navigation replacing Sidebar
- `client/src/views/DashboardPage.vue` — New home page

### Files to modify (restyle):
- `client/src/App.vue` — Replace Sidebar with TopNavBar, update background
- `client/src/router/index.js` — Add `/dashboard` route, change `/` to Dashboard
- `client/src/components/OrgCard.vue` — Restyle with glass theme
- `client/src/components/ConnectOrgModal.vue` — Use GlassModal, GlassInput, GlassButton
- `client/src/components/ConfirmModal.vue` — Use GlassModal, GlassButton, GlassInput
- `client/src/components/OrgDropdown.vue` — Use GlassDropdown pattern
- `client/src/components/Toast.vue` — Glass pill toasts
- `client/src/components/ProgressTracker.vue` — Glass container styling
- `client/src/components/MetadataTree.vue` — Glass search bar, glass category headers
- `client/src/components/PrerequisiteError.vue` — Glass styling
- `client/src/views/OrgsPage.vue` — Use glass components
- `client/src/views/RetrievePage.vue` — Use GlassPillStepper, glass components
- `client/src/views/DeployPage.vue` — Use GlassPillStepper, glass components
- `client/src/views/HistoryPage.vue` — Use GlassTable, glass filters

### Files to delete (cleanup):
- `client/src/components/Sidebar.vue`
- `client/src/components/WizardStepper.vue`

---

## Task 1: Glass Theme Foundation

**Files:**
- Modify: `client/src/assets/main.css`

- [ ] **Step 1: Replace CSS variables in main.css**

Replace the entire contents of `client/src/assets/main.css` with the new glass theme:

```css
@import "tailwindcss";

:root {
  /* Backgrounds */
  --bg-base: #09090b;
  --bg-base-end: #18181b;

  /* Glass surfaces */
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-hover: rgba(255, 255, 255, 0.05);
  --glass-bg-active: rgba(255, 255, 255, 0.07);
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-border-hover: rgba(255, 255, 255, 0.10);
  --glass-blur: blur(20px);
  --glass-blur-light: blur(12px);

  /* Radii */
  --radius-lg: 12px;
  --radius-md: 8px;
  --radius-sm: 6px;

  /* Primary accent (purple → indigo gradient) */
  --color-primary: #8b5cf6;
  --color-primary-end: #6366f1;
  --color-primary-glow: rgba(139, 92, 246, 0.15);
  --color-primary-bg: rgba(139, 92, 246, 0.12);
  --color-primary-border: rgba(139, 92, 246, 0.25);

  /* Status */
  --color-success: #4ade80;
  --color-success-bg: rgba(74, 222, 128, 0.10);
  --color-success-border: rgba(74, 222, 128, 0.20);
  --color-error: #f87171;
  --color-error-bg: rgba(248, 113, 113, 0.10);
  --color-error-border: rgba(248, 113, 113, 0.20);
  --color-warning: #fbbf24;
  --color-warning-bg: rgba(251, 191, 36, 0.10);
  --color-warning-border: rgba(251, 191, 36, 0.20);
  --color-info: #38bdf8;
  --color-info-bg: rgba(56, 189, 248, 0.10);
  --color-info-border: rgba(56, 189, 248, 0.20);

  /* Text */
  --text-primary: rgba(255, 255, 255, 0.90);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-muted: rgba(255, 255, 255, 0.30);
}

body {
  background: linear-gradient(135deg, var(--bg-base) 0%, var(--bg-base-end) 100%);
  background-attachment: fixed;
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}

/* Glass utility class */
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.glass-hover:hover {
  background: var(--glass-bg-hover);
  border-color: var(--glass-border-hover);
}

/* Glow effect for active/focused elements */
.glow {
  box-shadow: 0 0 15px var(--color-primary-glow);
}

.glow-sm {
  box-shadow: 0 0 8px var(--color-primary-glow);
}
```

- [ ] **Step 2: Verify the app still renders**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds (warnings OK, no errors). The app will look broken visually since old CSS var names are gone — that's expected and will be fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add client/src/assets/main.css
git commit -m "feat(ui): replace theme with glassmorphism dark tokens"
```

---

## Task 2: Glass Base Components

**Files:**
- Create: `client/src/components/glass/GlassCard.vue`
- Create: `client/src/components/glass/GlassButton.vue`
- Create: `client/src/components/glass/GlassInput.vue`
- Create: `client/src/components/glass/GlassBadge.vue`
- Create: `client/src/components/glass/GlassToggle.vue`

- [ ] **Step 1: Create GlassCard.vue**

```vue
<script setup>
defineProps({
  hover: { type: Boolean, default: false },
  glow: { type: Boolean, default: false },
  padding: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg', 'none'].includes(v) },
})
</script>

<template>
  <div
    class="glass"
    :class="[
      hover && 'glass-hover transition-all duration-200 cursor-pointer',
      glow && 'glow',
      {
        'p-3': padding === 'sm',
        'p-5': padding === 'md',
        'p-7': padding === 'lg',
      },
    ]"
  >
    <slot />
  </div>
</template>
```

- [ ] **Step 2: Create GlassButton.vue**

```vue
<script setup>
defineProps({
  variant: { type: String, default: 'primary', validator: (v) => ['primary', 'secondary', 'ghost', 'danger'].includes(v) },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <button
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[
      // Size
      {
        'px-3 py-1.5 text-xs rounded-[var(--radius-sm)] gap-1.5': size === 'sm',
        'px-4 py-2 text-sm rounded-[var(--radius-md)] gap-2': size === 'md',
        'px-6 py-2.5 text-base rounded-[var(--radius-md)] gap-2': size === 'lg',
      },
      // Variant
      variant === 'primary' && 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] text-white hover:shadow-[0_0_20px_var(--color-primary-glow)] active:scale-[0.98]',
      variant === 'secondary' && 'glass glass-hover text-[var(--text-primary)]',
      variant === 'ghost' && 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
      variant === 'danger' && 'bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error)] hover:bg-[rgba(248,113,113,0.15)]',
    ]"
  >
    <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>
```

- [ ] **Step 3: Create GlassInput.vue**

```vue
<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-primary-border)] focus:shadow-[0_0_8px_var(--color-primary-glow)] disabled:opacity-40 disabled:cursor-not-allowed"
      style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur)"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>
```

- [ ] **Step 4: Create GlassBadge.vue**

```vue
<script setup>
defineProps({
  variant: { type: String, default: 'info', validator: (v) => ['success', 'error', 'warning', 'info', 'purple'].includes(v) },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
})
</script>

<template>
  <span
    class="inline-flex items-center font-medium"
    :class="[
      {
        'px-1.5 py-0.5 text-[10px] rounded-[var(--radius-sm)]': size === 'sm',
        'px-2 py-0.5 text-xs rounded-[var(--radius-sm)]': size === 'md',
      },
      variant === 'success' && 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
      variant === 'error' && 'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error-border)]',
      variant === 'warning' && 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]',
      variant === 'info' && 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info-border)]',
      variant === 'purple' && 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border border-[var(--color-primary-border)]',
    ]"
  >
    <slot />
  </span>
</template>
```

- [ ] **Step 5: Create GlassToggle.vue**

```vue
<script setup>
const props = defineProps({
  options: { type: Array, required: true }, // [{ label, value }]
  modelValue: { type: [String, Number], default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="inline-flex p-1 gap-0.5 glass rounded-[var(--radius-md)]">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200"
      :class="
        modelValue === opt.value
          ? 'bg-[var(--color-primary-bg)] border border-[var(--color-primary-border)] text-[var(--text-primary)] glow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      "
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 6: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/glass/
git commit -m "feat(ui): add glass base components — Card, Button, Input, Badge, Toggle"
```

---

## Task 3: GlassModal, GlassDropdown, GlassTable, GlassPillStepper

**Files:**
- Create: `client/src/components/glass/GlassModal.vue`
- Create: `client/src/components/glass/GlassDropdown.vue`
- Create: `client/src/components/glass/GlassTable.vue`
- Create: `client/src/components/glass/GlassPillStepper.vue`

- [ ] **Step 1: Create GlassModal.vue**

```vue
<script setup>
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '480px' },
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />

        <!-- Panel -->
        <div
          class="relative glass p-6 w-full"
          :style="{ maxWidth }"
        >
          <h2 v-if="title" class="text-lg font-semibold text-[var(--text-primary)] mb-4">{{ title }}</h2>
          <slot />
          <div v-if="$slots.footer" class="mt-6 flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .glass,
.modal-leave-active .glass {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .glass {
  transform: scale(0.95);
}
</style>
```

- [ ] **Step 2: Create GlassDropdown.vue**

```vue
<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  options: { type: Array, required: true }, // [{ label, value, icon?, badge?, disabled? }]
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: 'Select...' },
  label: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const open = ref(false)
const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

function close() {
  open.value = false
}
</script>

<template>
  <div class="relative" @blur.capture="close">
    <label v-if="label" class="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{{ label }}</label>

    <!-- Trigger -->
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius-md)] glass glass-hover transition-all duration-200"
      :class="open && 'border-[var(--color-primary-border)] glow-sm'"
      @click="open = !open"
    >
      <span :class="selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'">
        {{ selected?.label || placeholder }}
      </span>
      <svg class="w-4 h-4 text-[var(--text-muted)] transition-transform" :class="open && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition name="dropdown">
      <div v-if="open" class="absolute z-40 mt-1 w-full glass p-1 max-h-60 overflow-y-auto">
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-all duration-150"
          :class="[
            opt.value === modelValue
              ? 'bg-[var(--color-primary-bg)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
            opt.disabled && 'opacity-40 cursor-not-allowed',
          ]"
          :disabled="opt.disabled"
          @click="!opt.disabled && ($emit('update:modelValue', opt.value), close())"
        >
          <span v-if="opt.icon" class="text-base">{{ opt.icon }}</span>
          <span class="flex-1 text-left">{{ opt.label }}</span>
          <span v-if="opt.badge" class="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--glass-bg-hover)] text-[var(--text-muted)]">{{ opt.badge }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
```

- [ ] **Step 3: Create GlassTable.vue**

```vue
<script setup>
defineProps({
  columns: { type: Array, required: true }, // [{ key, label, width?, align? }]
  rows: { type: Array, required: true },
  expandable: { type: Boolean, default: false },
})

defineEmits(['row-click'])

import { ref } from 'vue'
const expandedRow = ref(null)

function toggleRow(index) {
  expandedRow.value = expandedRow.value === index ? null : index
}
</script>

<template>
  <div class="glass overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-[var(--glass-border)]">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider text-left"
            :style="col.width ? { width: col.width } : {}"
            :class="col.align === 'right' && 'text-right'"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in rows" :key="index">
          <tr
            class="border-b border-[var(--glass-border)] last:border-0 transition-colors duration-150 hover:bg-[var(--glass-bg-hover)]"
            :class="expandable && 'cursor-pointer'"
            @click="expandable ? toggleRow(index) : $emit('row-click', row, index)"
          >
            <td v-for="col in columns" :key="col.key" class="px-4 py-3" :class="col.align === 'right' && 'text-right'">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="expandable && expandedRow === index">
            <td :colspan="columns.length" class="px-4 py-4 bg-[var(--glass-bg)]">
              <slot name="expanded" :row="row" :index="index" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **Step 4: Create GlassPillStepper.vue**

```vue
<script setup>
defineProps({
  steps: { type: Array, required: true }, // [{ label, key }]
  currentStep: { type: [String, Number], required: true }, // key of active step
  completedSteps: { type: Array, default: () => [] }, // array of completed keys
})

defineEmits(['step-click'])
</script>

<template>
  <div class="inline-flex p-1 gap-0.5 glass rounded-[var(--radius-md)]">
    <button
      v-for="(step, i) in steps"
      :key="step.key"
      class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200"
      :class="[
        currentStep === step.key
          ? 'bg-gradient-to-r from-[var(--color-primary-bg)] to-[rgba(99,102,241,0.12)] border border-[var(--color-primary-border)] text-[var(--text-primary)] glow-sm'
          : completedSteps.includes(step.key)
            ? 'text-[var(--color-primary)] hover:bg-[var(--glass-bg-hover)]'
            : 'text-[var(--text-muted)] cursor-default',
      ]"
      :disabled="!completedSteps.includes(step.key) && currentStep !== step.key"
      @click="(completedSteps.includes(step.key) || currentStep === step.key) && $emit('step-click', step.key)"
    >
      <!-- Step indicator -->
      <span
        class="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
        :class="[
          completedSteps.includes(step.key)
            ? 'bg-[var(--color-primary)] text-white'
            : currentStep === step.key
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border border-[var(--color-primary-border)]'
              : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-[var(--glass-border)]',
        ]"
      >
        <template v-if="completedSteps.includes(step.key)">&#10003;</template>
        <template v-else>{{ i + 1 }}</template>
      </span>
      {{ step.label }}
    </button>
  </div>
</template>
```

- [ ] **Step 5: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/glass/
git commit -m "feat(ui): add glass compound components — Modal, Dropdown, Table, PillStepper"
```

---

## Task 4: TopNavBar + App.vue Layout

**Files:**
- Create: `client/src/components/TopNavBar.vue`
- Modify: `client/src/App.vue`

- [ ] **Step 1: Create TopNavBar.vue**

```vue
<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'grid' },
  { label: 'Orgs', to: '/orgs', icon: 'globe' },
  { label: 'Retrieve', to: '/retrieve', icon: 'download' },
  { label: 'Deploy', to: '/deploy', icon: 'upload' },
  { label: 'History', to: '/history', icon: 'clock' },
]

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const icons = {
  grid: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  globe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  download: 'M12 16l-4-4h2.5V4h3v8H16l-4 4zM4 18h16v2H4v-2z',
  upload: 'M12 8l4 4h-2.5v8h-3v-8H8l4-4zM4 4h16v2H4V4z',
  clock: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
}
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 glass border-t-0 border-l-0 border-r-0 rounded-none border-b border-b-[var(--glass-border)]" style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);">
    <!-- Left: Logo -->
    <router-link to="/" class="flex items-center gap-2 mr-8">
      <div class="w-7 h-7 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)] flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-3.14 1.346 2.14.916a1 1 0 00.788 0l7-3a1 1 0 000-1.84l-7-3z" />
          <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
        </svg>
      </div>
      <span class="text-sm font-semibold text-[var(--text-primary)]">SF Deploy Kit</span>
    </router-link>

    <!-- Center: Nav tabs -->
    <div class="flex-1 flex justify-center">
      <div class="inline-flex p-1 gap-0.5 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.02)]">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200"
          :class="
            isActive(item.to)
              ? 'bg-[var(--color-primary-bg)] border border-[var(--color-primary-border)] text-[var(--text-primary)] glow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          "
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path :d="icons[item.icon]" />
          </svg>
          {{ item.label }}
        </router-link>
      </div>
    </div>

    <!-- Right: org count -->
    <div class="w-[140px] flex justify-end">
      <slot name="right" />
    </div>
  </nav>
</template>
```

- [ ] **Step 2: Rewrite App.vue**

Replace the entire contents of `client/src/App.vue`:

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from './composables/useApi'
import TopNavBar from './components/TopNavBar.vue'
import PrerequisiteError from './components/PrerequisiteError.vue'
import Toast from './components/Toast.vue'
import GlassBadge from './components/glass/GlassBadge.vue'
import { useOrgs } from './composables/useOrgs'

const api = useApi()
const { orgs } = useOrgs()
const connectedCount = computed(() => orgs.value.filter((o) => o.status === 'connected').length)
const prereqResult = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    prereqResult.value = await api.get('/prerequisites')
  } catch {
    prereqResult.value = { passed: false, checks: [{ name: 'Server', status: 'fail', message: 'Cannot reach server' }] }
  }
  loading.value = false
})

const allPassed = () => prereqResult.value?.passed || prereqResult.value?.checks?.every((c) => c.status === 'pass')
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="flex items-center justify-center h-screen">
    <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
  </div>

  <!-- Prerequisite failure -->
  <PrerequisiteError
    v-else-if="!allPassed()"
    :checks="prereqResult.checks"
    @resolved="prereqResult = $event"
  />

  <!-- Main app -->
  <div v-else class="min-h-screen">
    <TopNavBar>
      <template #right>
        <GlassBadge v-if="connectedCount > 0" variant="purple" size="sm">{{ connectedCount }} org{{ connectedCount !== 1 ? 's' : '' }}</GlassBadge>
      </template>
    </TopNavBar>
    <main class="pt-14">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Toast />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/TopNavBar.vue client/src/App.vue
git commit -m "feat(ui): add TopNavBar and replace sidebar layout"
```

---

## Task 5: Router Update + Dashboard Page

**Files:**
- Modify: `client/src/router/index.js`
- Create: `client/src/views/DashboardPage.vue`

- [ ] **Step 1: Update router**

Replace the contents of `client/src/router/index.js`:

```js
import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../views/DashboardPage.vue'
import OrgsPage from '../views/OrgsPage.vue'
import RetrievePage from '../views/RetrievePage.vue'
import DeployPage from '../views/DeployPage.vue'
import HistoryPage from '../views/HistoryPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage },
    { path: '/orgs', name: 'orgs', component: OrgsPage },
    { path: '/retrieve', name: 'retrieve', component: RetrievePage },
    { path: '/deploy', name: 'deploy', component: DeployPage },
    { path: '/history', name: 'history', component: HistoryPage },
  ],
})

export default router
```

- [ ] **Step 2: Create DashboardPage.vue**

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'

const api = useApi()
const { orgs, loadOrgs } = useOrgs()

const history = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    await loadOrgs()
    const data = await api.get('/history')
    history.value = Array.isArray(data) ? data : data.records || []
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  }
  loading.value = false
})

const connectedOrgs = computed(() => orgs.value.filter((o) => o.status === 'connected').length)

const recentDeploys = computed(() => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return history.value.filter((h) => new Date(h.timestamp || h.date).getTime() > sevenDaysAgo)
})

const successRate = computed(() => {
  if (!recentDeploys.value.length) return null
  const passed = recentDeploys.value.filter((h) => h.status === 'success' || h.status === 'passed').length
  return Math.round((passed / recentDeploys.value.length) * 100)
})

const recentActivity = computed(() => history.value.slice(0, 5))

function timeAgo(date) {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
      <p class="text-sm text-[var(--text-secondary)] mt-1">Overview of your Salesforce deployment pipeline</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>

    <template v-else>
      <!-- Stat cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassCard>
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Connected Orgs</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ connectedOrgs }}</div>
          <router-link to="/orgs" class="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">Manage orgs &rarr;</router-link>
        </GlassCard>

        <GlassCard>
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Deploys (7 days)</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ recentDeploys.length }}</div>
          <router-link to="/history" class="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">View history &rarr;</router-link>
        </GlassCard>

        <GlassCard>
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Success Rate</div>
          <div class="text-3xl font-bold" :class="successRate === null ? 'text-[var(--text-muted)]' : successRate >= 80 ? 'text-[var(--color-success)]' : successRate >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'">
            {{ successRate === null ? '—' : `${successRate}%` }}
          </div>
          <span class="text-xs text-[var(--text-muted)] mt-2 inline-block">Based on last 7 days</span>
        </GlassCard>
      </div>

      <!-- Quick actions -->
      <div class="flex gap-3 mb-8">
        <router-link to="/retrieve">
          <GlassButton variant="primary">New Retrieve</GlassButton>
        </router-link>
        <router-link to="/deploy">
          <GlassButton variant="secondary">New Deploy</GlassButton>
        </router-link>
      </div>

      <!-- Recent activity -->
      <div>
        <h2 class="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Recent Activity</h2>
        <GlassCard v-if="recentActivity.length === 0" padding="lg">
          <p class="text-center text-[var(--text-muted)]">No recent activity. Start by connecting an org and running a retrieve.</p>
        </GlassCard>
        <div v-else class="space-y-2">
          <GlassCard v-for="item in recentActivity" :key="item.id || item.operationId" hover padding="sm">
            <div class="flex items-center gap-3">
              <!-- Status dot -->
              <div
                class="w-2 h-2 rounded-full"
                :class="
                  item.status === 'success' || item.status === 'passed' ? 'bg-[var(--color-success)]'
                  : item.status === 'failed' || item.status === 'error' ? 'bg-[var(--color-error)]'
                  : 'bg-[var(--color-warning)]'
                "
              />
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <span class="text-sm text-[var(--text-primary)]">{{ item.name || item.type || 'Deploy' }}</span>
                <span class="text-xs text-[var(--text-muted)] ml-2">{{ item.targetOrg || item.orgAlias || '' }}</span>
              </div>
              <!-- Meta -->
              <GlassBadge v-if="item.componentCount" variant="purple" size="sm">{{ item.componentCount }} components</GlassBadge>
              <span class="text-xs text-[var(--text-muted)]">{{ timeAgo(item.timestamp || item.date) }}</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </template>
  </div>
</template>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/router/index.js client/src/views/DashboardPage.vue
git commit -m "feat(ui): add Dashboard home page and update router"
```

---

## Task 6: Restyle Orgs Page + OrgCard + ConnectOrgModal + ConfirmModal

**Files:**
- Modify: `client/src/views/OrgsPage.vue`
- Modify: `client/src/components/OrgCard.vue`
- Modify: `client/src/components/ConnectOrgModal.vue`
- Modify: `client/src/components/ConfirmModal.vue`

- [ ] **Step 1: Restyle OrgCard.vue**

Read the current `OrgCard.vue` (104 lines). Replace the template with glass styling while keeping all existing props (`org`), emits (`refresh`, `reconnect`, `remove`), and logic (typeLabel, typeBadgeClass, timeAgo). The template should:
- Use `GlassCard` with `hover` prop as the root
- Org alias as bold heading, username as secondary text
- `GlassBadge` for org type: production → `error`, sandbox → `info`, developer → `success`, scratch → `warning`
- Green/red status dot (connected/expired)
- Last used as relative time
- Action buttons: `GlassButton` variant `ghost` size `sm` for Refresh/Reconnect, variant `danger` size `sm` for Remove

Import glass components: `GlassCard`, `GlassButton`, `GlassBadge`.

- [ ] **Step 2: Restyle ConnectOrgModal.vue**

Read the current `ConnectOrgModal.vue` (234 lines). Replace the template while keeping all existing logic (polling, health checks, step states). Use:
- `GlassModal` with `:show` and `@close`
- `GlassToggle` for production/sandbox selection
- `GlassInput` for alias and custom domain inputs
- `GlassButton` for all buttons
- Keep the same state machine: form → waiting → success → error

- [ ] **Step 3: Restyle ConfirmModal.vue**

Read the current `ConfirmModal.vue` (99 lines). Replace the template while keeping all existing props and emits. Use:
- `GlassModal` with `:show` and `@close`
- `GlassInput` for typed confirmation
- `GlassButton` for Cancel (variant `ghost`) and Confirm (variant `primary` or `danger` based on `dangerous` prop)

- [ ] **Step 4: Restyle OrgsPage.vue**

Read the current `OrgsPage.vue` (163 lines). Replace the template while keeping all existing logic. Changes:
- Use `max-w-5xl mx-auto px-6 py-8` container (matching Dashboard)
- Page header: "Connected Orgs" + `GlassButton` for "Connect Org"
- `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4` for org cards
- Empty state: `GlassCard` centered with text + button
- Single-org prompt: `GlassCard` with suggestion message

- [ ] **Step 5: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/views/OrgsPage.vue client/src/components/OrgCard.vue client/src/components/ConnectOrgModal.vue client/src/components/ConfirmModal.vue
git commit -m "feat(ui): restyle Orgs page with glass components"
```

---

## Task 7: Restyle Retrieve Page

**Files:**
- Modify: `client/src/views/RetrievePage.vue`
- Modify: `client/src/components/OrgDropdown.vue`

- [ ] **Step 1: Restyle OrgDropdown.vue**

Read the current `OrgDropdown.vue` (116 lines). Replace the template while keeping all logic (useOrgs, v-model pattern). Use:
- `GlassDropdown`-style trigger and panel (or inline the glass styling since OrgDropdown has custom logic like status indicators and reconnect labels)
- Glass dropdown trigger with chevron
- Glass dropdown panel with org list
- Status dots (green/red), type badges with `GlassBadge`
- Keep `modelValue` / `update:modelValue` pattern

- [ ] **Step 2: Restyle RetrievePage.vue**

Read the current `RetrievePage.vue` (476 lines). Replace the template while keeping all logic. Changes:
- `max-w-5xl mx-auto px-6 py-8` container
- Replace `WizardStepper` with `GlassPillStepper` — map current step index to step keys, track completed steps
- Step 0 (Source): Restyled OrgDropdown + health check with `GlassBadge` status
- Step 1 (Components): `GlassToggle` for mode, MetadataTree stays (will be restyled in Task 9)
- Step 2 (Review): `GlassCard` summary + `GlassInput` for retrieve name
- Step 3 (Execute): ProgressTracker stays (will be restyled in Task 9)
- Navigation buttons: `GlassButton` primary for Next/Execute, ghost for Back
- "Deploy These" button: `GlassButton` primary

- [ ] **Step 3: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add client/src/views/RetrievePage.vue client/src/components/OrgDropdown.vue
git commit -m "feat(ui): restyle Retrieve page with glass pill stepper"
```

---

## Task 8: Restyle Deploy Page

**Files:**
- Modify: `client/src/views/DeployPage.vue`

- [ ] **Step 1: Restyle DeployPage.vue**

Read the current `DeployPage.vue` (this is the largest file). Replace the template while keeping ALL logic — source selection, component selection, target org, validation, deploy execution, WebSocket listeners, auto-advance from retrieve. Changes:
- `max-w-5xl mx-auto px-6 py-8` container
- Replace `WizardStepper` with `GlassPillStepper`
- Step 0 (Source): `GlassToggle` for "Previous Retrieve" / "From Org", `GlassCard` list for retrieves
- Step 1 (Components): component list in `GlassCard`, MetadataTree stays
- Step 2 (Target): restyled `OrgDropdown` + health check + production warning in `GlassCard` with amber border
- Step 3 (Validate): `GlassButton` to run validation, results in `GlassCard` with per-component rows
- Step 4 (Deploy): ProgressTracker stays, post-deploy actions with `GlassButton`
- Navigation: `GlassButton` for all Next/Back/Execute buttons

- [ ] **Step 2: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/DeployPage.vue
git commit -m "feat(ui): restyle Deploy page with glass components"
```

---

## Task 9: Restyle ProgressTracker, MetadataTree, Toast, PrerequisiteError

**Files:**
- Modify: `client/src/components/ProgressTracker.vue`
- Modify: `client/src/components/MetadataTree.vue`
- Modify: `client/src/components/Toast.vue`
- Modify: `client/src/components/PrerequisiteError.vue`

- [ ] **Step 1: Restyle ProgressTracker.vue**

Read the current `ProgressTracker.vue` (233 lines). Replace the template while keeping all WebSocket logic. Changes:
- Wrap in `GlassCard`
- Header with status text + elapsed time
- Progress bar: gradient from `var(--color-primary)` to `var(--color-primary-end)`, glass track background
- Per-component rows: glass-styled rows with status icons
- Log panel: glass container with `font-mono text-xs`
- End-state banners: `GlassCard` with success/error tinted borders

- [ ] **Step 2: Restyle MetadataTree.vue**

Read the current `MetadataTree.vue` (large file). Replace the template while keeping all logic (search, filtering, categories, virtual scrolling, bundles, checkboxes). Changes:
- Glass search bar at top with `GlassInput` styling
- "Recently Modified" toggle: `GlassToggle` or glass pill button
- Category headers: glass styling with sticky positioning
- Component rows: subtle glass hover, `GlassBadge` for type
- Keep virtual scrolling (RecycleScroller) as-is
- Search highlight: purple background tint instead of current

- [ ] **Step 3: Restyle Toast.vue**

Read the current `Toast.vue` (40 lines). Replace styling:
- Glass pill shape per toast
- Success: green-tinted glass (`bg-[var(--color-success-bg)]` + `border-[var(--color-success-border)]`)
- Error: red-tinted glass
- Icon + message text

- [ ] **Step 4: Restyle PrerequisiteError.vue**

Read the current `PrerequisiteError.vue` (102 lines). Replace template while keeping retry logic:
- Centered glass card on full-height background
- Check list with status icons
- `GlassButton` for retry

- [ ] **Step 5: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ProgressTracker.vue client/src/components/MetadataTree.vue client/src/components/Toast.vue client/src/components/PrerequisiteError.vue
git commit -m "feat(ui): restyle ProgressTracker, MetadataTree, Toast, PrerequisiteError"
```

---

## Task 10: Restyle History Page

**Files:**
- Modify: `client/src/views/HistoryPage.vue`

- [ ] **Step 1: Restyle HistoryPage.vue**

Read the current `HistoryPage.vue` (481 lines). Replace the template while keeping all logic (filtering, rollback, expandable rows). Changes:
- `max-w-6xl mx-auto px-6 py-8` container (wider for table)
- Page header: "Deployment History"
- Filter row: `GlassToggle` for status filter (All/Passed/Failed), glass pill buttons for date range (7d/30d/90d/Custom)
- History table: use `GlassTable` or inline glass table styling with:
  - Glass header row (sticky)
  - Status column: `GlassBadge` (success/error/warning)
  - Expandable detail rows: glass panel with operation details, component list, error breakdown
  - Production org rows: purple left border highlight
- Rollback button: `GlassButton` variant `danger` size `sm`
- Empty state: `GlassCard` with message

- [ ] **Step 2: Verify build**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/src/views/HistoryPage.vue
git commit -m "feat(ui): restyle History page with glass table and filters"
```

---

## Task 11: Cleanup — Remove Old Components

**Files:**
- Delete: `client/src/components/Sidebar.vue`
- Delete: `client/src/components/WizardStepper.vue`

- [ ] **Step 1: Verify no imports reference old components**

Run: `grep -r "Sidebar\|WizardStepper" client/src/ --include="*.vue" --include="*.js" -l`
Expected: No files returned (all references already removed in previous tasks).

- [ ] **Step 2: Delete old components**

```bash
rm client/src/components/Sidebar.vue client/src/components/WizardStepper.vue
```

- [ ] **Step 3: Final build verification**

Run: `cd /Users/theodor/Documents/Development/salesforce-deploy-kit/client && npx vite build 2>&1 | tail -10`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -u client/src/components/
git commit -m "chore(ui): remove Sidebar and WizardStepper (replaced by TopNavBar and GlassPillStepper)"
```

---

## Summary

| Task | Description | Files touched |
|------|-------------|---------------|
| 1 | Glass theme foundation | 1 (main.css) |
| 2 | Glass base components | 5 new |
| 3 | Glass compound components | 4 new |
| 4 | TopNavBar + App.vue layout | 1 new, 1 modified |
| 5 | Router + Dashboard page | 1 new, 1 modified |
| 6 | Orgs page + OrgCard + modals | 4 modified |
| 7 | Retrieve page + OrgDropdown | 2 modified |
| 8 | Deploy page | 1 modified |
| 9 | ProgressTracker, MetadataTree, Toast, PrerequisiteError | 4 modified |
| 10 | History page | 1 modified |
| 11 | Cleanup old components | 2 deleted |

**Total: 11 tasks, ~25 files, 11 commits**
