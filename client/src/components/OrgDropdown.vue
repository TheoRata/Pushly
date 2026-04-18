<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useOrgs } from '../composables/useOrgs'
import GlassBadge from './glass/GlassBadge.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Select Org' },
  exclude: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const { orgs, refresh } = useOrgs()
const open = ref(false)
const query = ref('')
const highlightIndex = ref(-1)
const inputRef = ref(null)
const listRef = ref(null)

onMounted(() => {
  if (orgs.value.length === 0) refresh().catch(() => {})
})

const selectedOrg = computed(() => orgs.value.find((o) => o.alias === props.modelValue))

const available = computed(() =>
  props.exclude ? orgs.value.filter((o) => o.alias !== props.exclude) : orgs.value
)

const filtered = computed(() => {
  if (!query.value) return available.value
  const q = query.value.toLowerCase()
  return available.value.filter(
    (o) =>
      o.alias.toLowerCase().includes(q) ||
      (o.username && o.username.toLowerCase().includes(q))
  )
})

function toggle() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    highlightIndex.value = -1
    nextTick(() => inputRef.value?.focus())
  }
}

function close() {
  open.value = false
  query.value = ''
}

function select(alias) {
  emit('update:modelValue', alias)
  close()
}

function statusColor(status) {
  switch (status) {
    case 'connected': return 'bg-[var(--color-success)]'
    case 'expiring': return 'bg-[var(--color-warning)]'
    case 'expired': return 'bg-[var(--color-error)]'
    default: return 'bg-[var(--text-muted)]'
  }
}

function onKeydown(e) {
  const list = filtered.value
  if (!list.length) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = (highlightIndex.value + 1) % list.length
    scrollToHighlighted()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = (highlightIndex.value - 1 + list.length) % list.length
    scrollToHighlighted()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (highlightIndex.value >= 0 && highlightIndex.value < list.length) {
      select(list[highlightIndex.value].alias)
    }
  } else if (e.key === 'Escape') {
    close()
  }
}

function scrollToHighlighted() {
  nextTick(() => {
    const el = listRef.value?.querySelector(`[data-index="${highlightIndex.value}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  })
}

watch(query, () => { highlightIndex.value = 0 })
</script>

<template>
  <div class="relative">
    <label v-if="label" class="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
      {{ label }}
    </label>

    <!-- Trigger -->
    <button
      type="button"
      class="flex items-center justify-between w-full px-3 py-2.5 rounded-[var(--radius-md)] glass text-sm transition-all duration-200 cursor-pointer"
      :class="open ? 'border-[var(--color-primary-border)] glow-sm' : 'glass-hover'"
      style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur)"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span v-if="selectedOrg" class="flex items-center gap-2 truncate text-[var(--text-primary)]">
        <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(selectedOrg.status)]" />
        {{ selectedOrg.alias }}
        <span class="text-xs text-[var(--text-muted)]">{{ selectedOrg.username }}</span>
      </span>
      <span v-else class="text-[var(--text-muted)]">{{ label }}</span>

      <svg
        class="w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform duration-200"
        :class="open && 'rotate-180'"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="m7 15 5 5 5-5M7 9l5-5 5 5" />
      </svg>
    </button>

    <!-- Popup -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-[0.98]"
    >
      <div
        v-if="open"
        class="absolute z-50 mt-1 w-full rounded-[var(--radius-lg)] border border-[var(--glass-border)] shadow-[0_20px_40px_rgba(91,108,240,0.12)] overflow-hidden"
        style="background: var(--nav-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);"
      >
        <!-- Search -->
        <div class="p-2 border-b border-[var(--glass-border)]">
          <div class="relative">
            <svg class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              placeholder="Search orgs..."
              class="w-full h-8 pl-8 pr-3 text-sm rounded-[var(--radius-md)] bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-150 focus:border-[var(--color-primary-border)] focus:shadow-[0_0_6px_var(--color-primary-glow)]"
              @keydown="onKeydown"
              @blur="setTimeout(() => { if (open) close() }, 200)"
            />
          </div>
        </div>

        <!-- List -->
        <div ref="listRef" role="listbox" class="max-h-56 overflow-y-auto p-1">
          <div v-if="filtered.length === 0" class="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
            No orgs found.
          </div>

          <button
            v-for="(org, i) in filtered"
            :key="org.alias"
            :data-index="i"
            type="button"
            role="option"
            :aria-selected="org.alias === modelValue"
            class="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-[var(--radius-sm)] transition-all duration-100 cursor-pointer"
            :class="[
              org.status === 'expired' && 'opacity-60',
              i === highlightIndex
                ? 'bg-[var(--color-primary-bg)] text-[var(--text-primary)]'
                : org.alias === modelValue
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
            ]"
            @mousedown.prevent="select(org.alias)"
            @mouseenter="highlightIndex = i"
          >
            <!-- Check -->
            <span class="w-4 h-4 flex items-center justify-center flex-shrink-0">
              <svg
                v-if="org.alias === modelValue"
                class="w-3.5 h-3.5 text-[var(--color-primary)]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </span>

            <!-- Status dot -->
            <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(org.status)]" />

            <!-- Alias + username -->
            <div class="flex-1 text-left min-w-0">
              <div class="truncate font-medium">{{ org.alias }}</div>
              <div v-if="org.username" class="text-xs text-[var(--text-muted)] truncate">{{ org.username }}</div>
            </div>

            <!-- Badges -->
            <span v-if="org.status === 'expired'" class="text-[10px] text-[var(--color-error)]">Reconnect</span>
            <GlassBadge v-if="org.type === 'production'" variant="error" size="sm">PROD</GlassBadge>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
