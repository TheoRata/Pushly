<script setup>
import GlassBadge from '../glass/GlassBadge.vue'

const props = defineProps({
  component: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['toggle'])

function highlight(text) {
  const q = props.searchQuery
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return `${before}<mark class="bg-[var(--color-primary-bg)] text-[var(--color-primary)] rounded px-0.5">${match}</mark>${after}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div
    class="component-row flex items-center gap-2.5 px-4 h-[42px] cursor-pointer outline-none"
    :class="{ selected }"
    role="checkbox"
    :aria-checked="selected"
    :aria-label="component.fullName"
    tabindex="0"
    @click="emit('toggle', component)"
    @keydown.space.prevent="emit('toggle', component)"
    @keydown.enter.prevent="emit('toggle', component)"
  >
    <!-- Checkbox -->
    <span class="relative w-[18px] h-[18px] shrink-0">
      <span
        class="absolute inset-0 rounded-[5px] border-solid transition-all duration-100"
        :class="selected ? 'border-[1.5px] border-[var(--color-primary)]' : 'border-[1.5px] border-[var(--glass-border-hover)]'"
      />
      <svg
        v-if="selected"
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        class="absolute inset-0 text-[var(--color-primary)] check-animated"
      >
        <path d="M6 12L10 16L18 8" />
      </svg>
    </span>

    <!-- Component name -->
    <span
      class="inline-grid text-[13px] truncate flex-1 min-w-0"
    >
      <span class="col-start-1 row-start-1 invisible font-bold" aria-hidden="true">{{ component.fullName }}</span>
      <span
        class="col-start-1 row-start-1 transition-all duration-100"
        :class="selected ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'"
        v-html="highlight(component.fullName)"
      />
    </span>

    <!-- Type badge -->
    <GlassBadge variant="purple" size="sm" class="shrink-0">{{ component.type }}</GlassBadge>

    <!-- Last modified date -->
    <span
      v-if="component.lastModified"
      class="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right"
    >{{ formatDate(component.lastModified) }}</span>
  </div>
</template>

<style scoped>
.component-row {
  transition: background 0.1s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
}

.component-row:hover {
  background: var(--glass-bg-hover);
}

.component-row.selected {
  background: var(--color-primary-bg);
  border-left: 3px solid var(--color-primary);
}

.component-row:focus-visible {
  outline: 1px solid var(--color-primary);
}

/* Animated checkmark draw */
.check-animated path {
  stroke-dasharray: 30;
  stroke-dashoffset: 0;
  animation: check-draw 0.12s ease-out;
}

@keyframes check-draw {
  from { stroke-dashoffset: 30; }
  to { stroke-dashoffset: 0; }
}
</style>
