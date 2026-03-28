<script setup>
import { ref, computed } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import ComponentRow from './ComponentRow.vue'
import GlassBadge from '../glass/GlassBadge.vue'

const props = defineProps({
  components: { type: Array, required: true },
  selectedComponents: { type: Array, default: () => [] },
  searchQuery: { type: String, default: '' },
  recentOnly: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  refreshing: { type: Boolean, default: false },
  activeCategory: { type: String, default: null },
  getFieldsForObject: { type: Function, default: () => [] },
})

const emit = defineEmits(['search', 'toggle-component', 'toggle-recent', 'refresh-all', 'refresh-open'])

const refreshDropdownOpen = ref(false)
const searchFocused = ref(false)

// Drill-down state
const drilledObject = ref(null)

const objectFields = computed(() => {
  if (!drilledObject.value) return []
  return props.getFieldsForObject(drilledObject.value.fullName)
})

const selectedFieldCount = computed(() => {
  if (!drilledObject.value) return 0
  const prefix = drilledObject.value.fullName + '.'
  return props.selectedComponents.filter(
    s => s.type === 'CustomField' && s.fullName.startsWith(prefix)
  ).length
})

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

function handleDrill(component) {
  drilledObject.value = component
}

function closeDrill() {
  drilledObject.value = null
}

function selectAllFields() {
  for (const field of objectFields.value) {
    if (!isSelected(field)) {
      emit('toggle-component', field)
    }
  }
}

function deselectAllFields() {
  for (const field of objectFields.value) {
    if (isSelected(field)) {
      emit('toggle-component', field)
    }
  }
}

function fieldShortName(fullName) {
  const dot = fullName.indexOf('.')
  return dot >= 0 ? fullName.slice(dot + 1) : fullName
}

// Add unique key for virtual scroller (fullName alone can duplicate across types)
const itemsWithKey = computed(() =>
  props.components.map(c => ({ ...c, _uid: `${c.type}:${c.fullName}` }))
)

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
  <div class="flex flex-col flex-1 h-full min-w-0 overflow-hidden">

    <!-- ===== DRILL-DOWN VIEW (object fields) ===== -->
    <template v-if="drilledObject">
      <!-- Drill header -->
      <div class="shrink-0 border-b border-[var(--glass-border)] px-3 py-2.5 flex items-center gap-2">
        <button
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
          @click="closeDrill"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </button>
        <span class="text-sm font-medium text-[var(--text-primary)]">{{ drilledObject.fullName }}</span>
        <GlassBadge variant="purple" size="sm">CustomObject</GlassBadge>
      </div>

      <!-- Object selection row -->
      <div class="shrink-0 border-b border-[var(--glass-border)]">
        <ComponentRow
          :component="drilledObject"
          :selected="isSelected(drilledObject)"
          @toggle="handleToggle"
        />
        <p class="px-4 pb-2.5 -mt-1 text-xs text-[var(--text-muted)] pl-[42px]">
          Selecting the entire object includes all fields, validation rules, and settings
        </p>
      </div>

      <!-- Fields header -->
      <div class="shrink-0 flex items-center justify-between px-4 py-2 border-b border-[var(--glass-border)]">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Fields
          </span>
          <GlassBadge variant="info" size="sm">{{ objectFields.length }}</GlassBadge>
          <span v-if="selectedFieldCount > 0" class="text-xs text-[var(--color-primary)]">
            {{ selectedFieldCount }} selected
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="selectedFieldCount < objectFields.length"
            class="text-xs text-[var(--color-primary)] hover:underline"
            @click="selectAllFields"
          >Select all</button>
          <button
            v-if="selectedFieldCount > 0"
            class="text-xs text-[var(--text-muted)] hover:underline"
            @click="deselectAllFields"
          >Clear</button>
        </div>
      </div>

      <!-- Fields list -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="objectFields.length === 0" class="flex flex-col items-center justify-center py-12 gap-2">
          <svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
          <span class="text-sm text-[var(--text-muted)]">No custom fields found for this object</span>
        </div>
        <div
          v-for="field in objectFields"
          :key="field.fullName"
          class="field-row flex items-center gap-2.5 px-4 h-[42px] cursor-pointer"
          :class="{ 'field-selected': isSelected(field) }"
          @click="handleToggle(field)"
        >
          <!-- Checkbox -->
          <span class="relative w-[18px] h-[18px] shrink-0">
            <span
              class="absolute inset-0 rounded-[5px] border-solid transition-all duration-100"
              :class="isSelected(field) ? 'border-[1.5px] border-[var(--color-primary)]' : 'border-[1.5px] border-[var(--glass-border-hover)]'"
            />
            <svg
              v-if="isSelected(field)"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="absolute inset-0 text-[var(--color-primary)]"
            >
              <path d="M6 12L10 16L18 8" />
            </svg>
          </span>

          <!-- Field name (short) -->
          <span
            class="flex-1 text-[13px] truncate min-w-0 transition-all duration-100"
            :class="isSelected(field) ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'"
          >{{ fieldShortName(field.fullName) }}</span>

          <!-- Full name (dimmed) -->
          <span class="text-xs text-[var(--text-muted)] shrink-0 truncate max-w-[200px]">{{ field.fullName }}</span>

          <!-- Modified -->
          <span v-if="field.lastModified" class="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right">
            {{ new Date(field.lastModified).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
          </span>
        </div>
      </div>
    </template>

    <!-- ===== NORMAL VIEW ===== -->
    <template v-else>
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
            class="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--glass-border)] shadow-lg z-20 overflow-hidden"
            style="background: var(--nav-bg); backdrop-filter: var(--glass-blur);"
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
          :items="itemsWithKey"
          :item-size="42"
          key-field="_uid"
          class="flex-1 scroller-full-width"
        >
          <template #default="{ item }">
            <ComponentRow
              :component="item"
              :selected="isSelected(item)"
              :search-query="searchQuery"
              @toggle="handleToggle"
              @drill="handleDrill"
            />
          </template>
        </RecycleScroller>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scroller-full-width :deep(.vue-recycle-scroller__item-wrapper) {
  width: 100%;
}
.scroller-full-width :deep(.vue-recycle-scroller__item-view) {
  width: 100%;
}

.field-row {
  transition: background 0.1s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.025);
}
.field-row:hover {
  background: var(--glass-bg-hover);
}
.field-row.field-selected {
  background: var(--color-primary-bg);
  border-left: 3px solid var(--color-primary);
}
</style>
