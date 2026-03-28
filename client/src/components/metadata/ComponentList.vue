<script setup>
import { ref } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import ComponentRow from './ComponentRow.vue'

const props = defineProps({
  components: { type: Array, required: true },
  selectedComponents: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  recentOnly: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  refreshing: { type: Boolean, default: false },
  activeCategory: { type: String, default: null },
})

const emit = defineEmits(['search', 'toggle-component', 'toggle-recent', 'refresh-all', 'refresh-open'])

const refreshDropdownOpen = ref(false)
const searchFocused = ref(false)

function isSelected(component) {
  return props.selectedComponents.some(
    (s) => s.fullName === component.fullName && s.type === component.type
  )
}

function onSearchInput(e) {
  emit('search', e.target.value)
}

function handleToggle(component) {
  emit('toggle-component', component)
}

function onSearchFocus() {
  searchFocused.value = true
}

function onSearchBlur() {
  searchFocused.value = false
}

function toggleRefreshDropdown() {
  refreshDropdownOpen.value = !refreshDropdownOpen.value
}

function handleRefreshAll() {
  refreshDropdownOpen.value = false
  emit('refresh-all')
}

function handleRefreshOpen() {
  if (!props.activeCategory) return
  refreshDropdownOpen.value = false
  emit('refresh-open')
}
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Sticky search bar -->
    <div class="shrink-0 border-b border-[var(--glass-border)] px-3 py-2.5 flex items-center gap-2">
      <!-- Search input -->
      <div class="relative flex-1">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none"
          fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
        </svg>
        <input
          type="text"
          :value="searchQuery"
          :placeholder="activeCategory ? `Search in ${activeCategory}...` : 'Search all components...'"
          class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-150"
          :style="searchFocused
            ? 'border-color: var(--color-primary-border); box-shadow: 0 0 0 3px var(--color-primary-glow)'
            : ''"
          @input="onSearchInput"
          @focus="onSearchFocus"
          @blur="onSearchBlur"
        />
      </div>

      <!-- Recent toggle -->
      <button
        class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-all duration-150 shrink-0"
        :class="recentOnly
          ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary-border)] text-[var(--color-primary)]'
          : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'"
        @click="emit('toggle-recent')"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Recent
      </button>

      <!-- Refresh dropdown -->
      <div class="relative shrink-0">
        <button
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] transition-all duration-150"
          @click="toggleRefreshDropdown"
        >
          <svg
            class="w-3.5 h-3.5 transition-transform duration-500"
            :class="{ 'animate-spin': refreshing }"
            fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
          >
            <polyline points="23 4 23 10 17 10" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Refresh
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div
          v-if="refreshDropdownOpen"
          class="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-lg z-20 overflow-hidden"
        >
          <button
            class="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] transition-colors duration-100"
            @click="handleRefreshAll"
          >
            Refresh All
          </button>
          <button
            class="w-full text-left px-3 py-2 text-xs transition-colors duration-100"
            :class="activeCategory
              ? 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)]'
              : 'text-[var(--text-muted)] cursor-not-allowed opacity-50'"
            :disabled="!activeCategory"
            @click="handleRefreshOpen"
          >
            Refresh {{ activeCategory || 'Category' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Column header row -->
    <div class="shrink-0 flex items-center gap-2.5 px-4 py-1.5 border-b border-[var(--glass-border)]">
      <span class="w-[18px] shrink-0" />
      <span class="flex-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Name</span>
      <span class="w-20 text-center text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Type</span>
      <span class="w-16 text-right text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Modified</span>
    </div>

    <!-- Component list -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Loading state -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-12 gap-3 flex-1">
        <svg
          class="w-5 h-5 animate-spin text-[var(--color-primary)]"
          fill="none" viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span class="text-sm text-[var(--text-muted)]">Loading metadata...</span>
      </div>

      <!-- Empty state -->
      <div v-else-if="components.length === 0" class="flex flex-col items-center justify-center py-12 gap-3 flex-1">
        <svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" stroke-linecap="round" />
        </svg>
        <span class="text-sm text-[var(--text-muted)]">No matching components found</span>
      </div>

      <!-- Virtual list -->
      <RecycleScroller
        v-else
        :items="components"
        :item-size="42"
        key-field="fullName"
        class="flex-1"
      >
        <template #default="{ item }">
          <ComponentRow
            :component="item"
            :selected="isSelected(item)"
            :search-query="searchQuery"
            @toggle="handleToggle"
          />
        </template>
      </RecycleScroller>
    </div>
  </div>
</template>
