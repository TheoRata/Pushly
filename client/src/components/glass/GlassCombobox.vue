<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  options: { type: Array, required: true }, // [{ label, value, icon?, badge?, disabled?, subtitle? }]
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: 'Select...' },
  searchPlaceholder: { type: String, default: 'Search...' },
  label: { type: String, default: '' },
  showClear: { type: Boolean, default: false },
  emptyText: { type: String, default: 'No results found.' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const highlightIndex = ref(-1)
const inputRef = ref(null)
const listRef = ref(null)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

const filtered = computed(() => {
  if (!query.value) return props.options
  const q = query.value.toLowerCase()
  return props.options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      (o.subtitle && o.subtitle.toLowerCase().includes(q))
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

function selectOption(opt) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  close()
}

function clear() {
  emit('update:modelValue', '')
  close()
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
      selectOption(list[highlightIndex.value])
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

watch(query, () => {
  highlightIndex.value = 0
})

// Close on click outside
function onClickOutside(e) {
  close()
}
</script>

<template>
  <div class="relative" v-click-outside="onClickOutside">
    <label v-if="label" class="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
      {{ label }}
    </label>

    <!-- Trigger -->
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius-md)] glass transition-all duration-200 cursor-pointer"
      :class="open ? 'border-[var(--color-primary-border)] glow-sm' : 'glass-hover'"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span v-if="selected" class="flex items-center gap-2 truncate text-[var(--text-primary)]">
        <span v-if="selected.icon" class="text-base">{{ selected.icon }}</span>
        {{ selected.label }}
      </span>
      <span v-else class="text-[var(--text-muted)]">{{ placeholder }}</span>

      <div class="flex items-center gap-1">
        <!-- Clear button -->
        <span
          v-if="showClear && selected"
          class="p-0.5 rounded hover:bg-[var(--glass-bg-hover)] cursor-pointer"
          @click.stop="clear"
        >
          <svg class="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </span>
        <!-- Chevrons -->
        <svg class="w-4 h-4 text-[var(--text-muted)] transition-transform" :class="open && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m7 15 5 5 5-5M7 9l5-5 5 5" />
        </svg>
      </div>
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
        style="background: var(--glass-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);"
      >
        <!-- Search input -->
        <div class="p-2 border-b border-[var(--glass-border)]">
          <div class="relative">
            <svg class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              ref="inputRef"
              v-model="query"
              :placeholder="searchPlaceholder"
              class="w-full h-8 pl-8 pr-3 text-sm rounded-[var(--radius-md)] bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-150 focus:border-[var(--color-primary-border)] focus:shadow-[0_0_6px_var(--color-primary-glow)]"
              @keydown="onKeydown"
              @blur="setTimeout(() => { if (open) close() }, 200)"
            />
          </div>
        </div>

        <!-- Options list -->
        <div ref="listRef" role="listbox" class="max-h-56 overflow-y-auto p-1">
          <div v-if="filtered.length === 0" class="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
            {{ emptyText }}
          </div>

          <button
            v-for="(opt, i) in filtered"
            :key="opt.value"
            :data-index="i"
            type="button"
            role="option"
            :aria-selected="opt.value === modelValue"
            class="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-[var(--radius-sm)] transition-all duration-100 cursor-pointer"
            :class="[
              opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
              i === highlightIndex
                ? 'bg-[var(--color-primary-bg)] text-[var(--text-primary)]'
                : opt.value === modelValue
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
            ]"
            @mousedown.prevent="selectOption(opt)"
            @mouseenter="highlightIndex = i"
          >
            <!-- Check indicator -->
            <span class="w-4 h-4 flex items-center justify-center flex-shrink-0">
              <svg
                v-if="opt.value === modelValue"
                class="w-3.5 h-3.5 text-[var(--color-primary)]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </span>

            <!-- Icon -->
            <span v-if="opt.icon" class="text-base flex-shrink-0">{{ opt.icon }}</span>

            <!-- Label + subtitle -->
            <div class="flex-1 text-left min-w-0">
              <div class="truncate">{{ opt.label }}</div>
              <div v-if="opt.subtitle" class="text-xs text-[var(--text-muted)] truncate">{{ opt.subtitle }}</div>
            </div>

            <!-- Badge -->
            <span
              v-if="opt.badge"
              class="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] flex-shrink-0"
              :class="opt.badgeClass || 'bg-[var(--glass-bg-hover)] text-[var(--text-muted)]'"
            >
              {{ opt.badge }}
            </span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
