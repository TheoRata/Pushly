<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMetadata } from '../composables/useMetadata'
import { useApi } from '../composables/useApi'
import GlassButton from './glass/GlassButton.vue'
import GlassBadge from './glass/GlassBadge.vue'

const props = defineProps({
  orgAlias: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])

const api = useApi()
const {
  filteredCategories,
  loading,
  searchQuery,
  recentOnly,
  loadMetadata,
  refreshAll,
  refreshTypes,
  search,
  toggleRecentlyModified,
} = useMetadata()

const refreshing = ref(false)
const refreshingSelected = ref(false)

async function handleRefreshAll() {
  refreshing.value = true
  try { await refreshAll() } catch {}
  refreshing.value = false
}

async function handleRefreshSelected() {
  // Refresh the types within all currently expanded categories
  const expandedCats = filteredCategories.value.filter(c => expandedCategories.value.has(c.name))
  if (expandedCats.length === 0) return
  refreshingSelected.value = true
  const types = expandedCats.flatMap(c => c.types.map(t => t.xmlName || t))
  try { await refreshTypes(types) } catch {}
  refreshingSelected.value = false
}

// Bundle state
const bundles = ref([])
const showBundleSave = ref(false)
const bundleName = ref('')
const showBundleDropdown = ref(false)
const showSelectedPreview = ref(false)

// Selection helpers
const selected = computed(() => props.modelValue)

function isSelected(component) {
  return selected.value.some(
    (s) => s.fullName === component.fullName && s.type === component.type
  )
}

function toggleComponent(component) {
  const current = [...selected.value]
  const idx = current.findIndex(
    (s) => s.fullName === component.fullName && s.type === component.type
  )
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push({ fullName: component.fullName, type: component.type })
  }
  emit('update:modelValue', current)
}

function toggleCategory(category) {
  const current = [...selected.value]
  const allSelected = category.components.every((c) => isSelected(c))

  if (allSelected) {
    // Deselect all in this category
    const filtered = current.filter(
      (s) => !category.components.some((c) => c.fullName === s.fullName && c.type === s.type)
    )
    emit('update:modelValue', filtered)
  } else {
    // Select all in this category
    const toAdd = category.components
      .filter((c) => !isSelected(c))
      .map((c) => ({ fullName: c.fullName, type: c.type }))
    emit('update:modelValue', [...current, ...toAdd])
  }
}

function removeSelected(component) {
  const current = selected.value.filter(
    (s) => !(s.fullName === component.fullName && s.type === component.type)
  )
  emit('update:modelValue', current)
}

function clearAll() {
  emit('update:modelValue', [])
}

// Category expand/collapse — tracked separately since filteredCategories creates new objects
const expandedCategories = ref(new Set())

function toggleExpand(category) {
  if (expandedCategories.value.has(category.name)) {
    expandedCategories.value.delete(category.name)
  } else {
    expandedCategories.value.add(category.name)
  }
  // Trigger reactivity
  expandedCategories.value = new Set(expandedCategories.value)
}

function isExpanded(category) {
  return expandedCategories.value.has(category.name)
}

// Category checkbox state
function categoryCheckState(category) {
  if (category.components.length === 0) return 'none'
  const selectedCount = category.components.filter((c) => isSelected(c)).length
  if (selectedCount === 0) return 'none'
  if (selectedCount === category.components.length) return 'all'
  return 'some'
}

// Bundle functions
async function loadBundles() {
  try {
    const { bundles: list } = await api.get('/bundles')
    bundles.value = list || []
  } catch {
    bundles.value = []
  }
}

async function saveBundle() {
  if (!bundleName.value.trim()) return
  try {
    await api.post('/bundles', {
      name: bundleName.value.trim(),
      components: selected.value,
    })
    bundleName.value = ''
    showBundleSave.value = false
    await loadBundles()
  } catch (err) {
    console.error('Failed to save bundle:', err)
  }
}

async function loadBundle(bundle) {
  emit('update:modelValue', bundle.components || [])
  showBundleDropdown.value = false
}

async function deleteBundle(name) {
  try {
    await api.del(`/bundles/${encodeURIComponent(name)}`)
    await loadBundles()
  } catch (err) {
    console.error('Failed to delete bundle:', err)
  }
}

// Date formatting
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Handle search input — auto-expand matching categories
function onSearchInput(e) {
  const q = e.target.value
  search(q)
  // Auto-expand all categories when searching, collapse when cleared
  if (q.trim()) {
    // Small delay to let filteredCategories update
    setTimeout(() => {
      filteredCategories.value.forEach((cat) => {
        if (cat.components.length > 0) {
          expandedCategories.value.add(cat.name)
        }
      })
      expandedCategories.value = new Set(expandedCategories.value)
    }, 350) // slightly after the 300ms debounce
  }
}

// Highlight matching text in component names
function highlightMatch(text) {
  const q = searchQuery.value
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return `${before}<mark class="bg-[var(--color-primary-bg)] text-[var(--color-primary)] rounded px-0.5">${match}</mark>${after}`
}

// Load metadata and bundles on mount
watch(
  () => props.orgAlias,
  (alias) => {
    if (alias) loadMetadata(alias)
  },
  { immediate: true }
)

onMounted(() => {
  loadBundles()
})
</script>

<template>
  <div class="flex flex-col h-full glass overflow-hidden">
    <!-- Search bar + controls -->
    <div class="p-3 border-b border-[var(--glass-border)]">
      <div class="flex gap-2">
        <!-- Search input -->
        <div class="relative flex-1">
          <svg
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search components..."
            class="w-full pl-10 pr-3 py-2 text-sm rounded-[var(--radius-md)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200"
            style="background: var(--glass-bg); border: 1px solid var(--glass-border);"
            :value="searchQuery"
            @input="onSearchInput"
            @focus="(e) => e.target.style.cssText += '; border-color: var(--color-primary-border); box-shadow: 0 0 0 3px var(--color-primary-glow);'"
            @blur="(e) => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }"
          />
        </div>

        <!-- Recently Modified toggle -->
        <button
          class="px-3 py-2 text-xs font-medium rounded-[var(--radius-md)] border transition-all duration-200 cursor-pointer whitespace-nowrap"
          :class="
            recentOnly
              ? 'text-[var(--color-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          "
          :style="recentOnly
            ? 'background: var(--color-primary-bg); border-color: var(--color-primary-border);'
            : 'background: var(--glass-bg); border-color: var(--glass-border);'"
          @click="toggleRecentlyModified"
        >
          <svg class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent
        </button>

        <!-- Refresh All -->
        <button
          class="px-3 py-2 text-xs font-medium rounded-[var(--radius-md)] border transition-all duration-200 cursor-pointer whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          style="background: var(--glass-bg); border-color: var(--glass-border);"
          :disabled="refreshing"
          @click="handleRefreshAll"
        >
          <svg
            class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5"
            :class="refreshing && 'animate-spin'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Refresh All
        </button>

        <!-- Refresh Expanded -->
        <button
          class="px-3 py-2 text-xs font-medium rounded-[var(--radius-md)] border transition-all duration-200 cursor-pointer whitespace-nowrap"
          :class="
            expandedCategories.size > 0
              ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] opacity-50 pointer-events-none'
          "
          style="background: var(--glass-bg); border-color: var(--glass-border);"
          :disabled="expandedCategories.size === 0 || refreshingSelected"
          @click="handleRefreshSelected"
        >
          <svg
            class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5"
            :class="refreshingSelected && 'animate-spin'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
          </svg>
          Refresh Open
        </button>
      </div>

      <!-- Bundle controls -->
      <div class="flex items-center gap-2 mt-2">
        <!-- Save as Bundle -->
        <div class="relative">
          <GlassButton
            variant="ghost"
            size="sm"
            :disabled="selected.length === 0"
            @click="showBundleSave = !showBundleSave"
          >
            Save Bundle
          </GlassButton>
          <!-- Save input dropdown -->
          <div
            v-if="showBundleSave"
            class="absolute top-full left-0 mt-1 p-2 rounded-[var(--radius-md)] shadow-xl z-20 min-w-[200px]"
            style="background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border);"
          >
            <input
              v-model="bundleName"
              type="text"
              placeholder="Bundle name..."
              class="w-full px-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2"
              style="background: var(--glass-bg-hover); border: 1px solid var(--glass-border);"
              @keydown.enter="saveBundle"
            />
            <div class="flex gap-1.5">
              <GlassButton variant="primary" size="sm" class="flex-1" @click="saveBundle">
                Save
              </GlassButton>
              <GlassButton variant="ghost" size="sm" @click="showBundleSave = false">
                Cancel
              </GlassButton>
            </div>
          </div>
        </div>

        <!-- Load Bundle -->
        <div class="relative">
          <GlassButton
            variant="ghost"
            size="sm"
            :disabled="bundles.length === 0"
            @click="showBundleDropdown = !showBundleDropdown"
          >
            Load Bundle
            <svg class="w-3 h-3 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </GlassButton>
          <!-- Bundle list dropdown -->
          <div
            v-if="showBundleDropdown"
            class="absolute top-full left-0 mt-1 rounded-[var(--radius-md)] shadow-xl z-20 min-w-[200px] max-h-48 overflow-y-auto"
            style="background: var(--glass-bg); backdrop-filter: var(--glass-blur); border: 1px solid var(--glass-border);"
          >
            <div
              v-for="bundle in bundles"
              :key="bundle.name"
              class="flex items-center justify-between px-3 py-2 cursor-pointer group transition-colors"
              style="transition: background 0.15s;"
              @mouseover="(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'"
              @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
              @click="loadBundle(bundle)"
            >
              <div>
                <span class="text-xs text-[var(--text-primary)]">{{ bundle.name }}</span>
                <span class="text-xs text-[var(--text-muted)] ml-1.5">
                  ({{ (bundle.components || []).length }})
                </span>
              </div>
              <button
                class="opacity-0 group-hover:opacity-100 text-[var(--color-error)]/70 hover:text-[var(--color-error)] transition-opacity cursor-pointer"
                @click.stop="deleteBundle(bundle.name)"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div v-if="bundles.length === 0" class="px-3 py-2 text-xs text-[var(--text-muted)]">
              No saved bundles
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <svg class="animate-spin w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span class="ml-2 text-sm text-[var(--text-muted)]">Loading metadata types...</span>
    </div>

    <!-- Category list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div v-if="filteredCategories.length === 0" class="flex flex-col items-center justify-center py-12 px-4">
        <svg class="w-10 h-10 text-[var(--text-muted)]/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p class="text-sm text-[var(--text-muted)]">No matching components found</p>
      </div>

      <div v-for="category in filteredCategories" :key="category.name" class="border-b border-[var(--glass-border)] last:border-b-0">
        <!-- Category header -->
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 transition-colors cursor-pointer text-left sticky top-0 z-10"
          style="background: var(--glass-bg); backdrop-filter: var(--glass-blur-light); border-bottom: 1px solid var(--glass-border);"
          @mouseover="(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'"
          @mouseleave="(e) => e.currentTarget.style.background = 'var(--glass-bg)'"
          @click="toggleExpand(category)"
        >
          <!-- Expand chevron -->
          <svg
            class="w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 shrink-0"
            :class="isExpanded(category) ? 'rotate-90' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>

          <!-- Category checkbox -->
          <span
            class="relative w-[18px] h-[18px] shrink-0 cursor-pointer"
            @click.stop="toggleCategory(category)"
          >
            <span
              class="absolute inset-0 rounded-[5px] border-solid transition-all duration-100"
              :class="
                categoryCheckState(category) === 'all'
                  ? 'border-[1.5px] border-[var(--color-primary)]'
                  : categoryCheckState(category) === 'some'
                    ? 'border-[1.5px] border-[var(--color-primary)]'
                    : 'border-[1.5px] border-[var(--glass-border-hover)]'
              "
            />
            <svg
              v-if="categoryCheckState(category) === 'all'"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
              class="absolute inset-0 text-[var(--color-primary)] check-animated"
            >
              <path d="M6 12L10 16L18 8" />
            </svg>
            <svg
              v-else-if="categoryCheckState(category) === 'some'"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
              class="absolute inset-0 text-[var(--color-primary)]"
            >
              <path d="M7 12h10" />
            </svg>
          </span>

          <!-- Category name -->
          <span class="text-sm font-medium text-[var(--text-primary)] flex-1">
            {{ category.name }}
          </span>

          <!-- Count badge -->
          <GlassBadge variant="purple" size="sm">
            {{ category.components.length }}
          </GlassBadge>

          <!-- Loading spinner for progressive load -->
          <svg
            v-if="category.loading"
            class="animate-spin w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </button>

        <!-- Expanded component list -->
        <div
          v-if="isExpanded(category)"
          style="background: var(--glass-bg);"
        >
          <div v-if="category.loading" class="flex items-center gap-2 px-6 py-3">
            <svg class="animate-spin w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span class="text-xs text-[var(--text-muted)]">Loading components...</span>
          </div>

          <div v-else-if="category.components.length === 0" class="px-6 py-3">
            <span class="text-xs text-[var(--text-muted)]">No components found</span>
          </div>

          <!-- Virtual scroller for large lists (>30 items) -->
          <RecycleScroller
            v-else-if="category.components.length > 30"
            :items="category.components"
            :item-size="40"
            :key-field="null"
            class="scroller"
            :style="{ height: Math.min(category.components.length * 40, 400) + 'px' }"
          >
            <template #default="{ item: comp }">
              <div
                class="metadata-check-row flex items-center gap-2.5 px-4 pl-11 h-[40px] cursor-pointer outline-none"
                role="checkbox"
                :aria-checked="isSelected(comp)"
                :aria-label="comp.fullName"
                tabindex="0"
                @click="toggleComponent(comp)"
                @keydown.space.prevent="toggleComponent(comp)"
                @keydown.enter.prevent="toggleComponent(comp)"
              >
                <span class="relative w-[18px] h-[18px] shrink-0" @click.stop="toggleComponent(comp)">
                  <span
                    class="absolute inset-0 rounded-[5px] border-solid transition-all duration-100"
                    :class="isSelected(comp) ? 'border-[1.5px] border-[var(--color-primary)]' : 'border-[1.5px] border-[var(--glass-border-hover)]'"
                  />
                  <svg
                    v-if="isSelected(comp)"
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="absolute inset-0 text-[var(--color-primary)] check-animated"
                  >
                    <path d="M6 12L10 16L18 8" />
                  </svg>
                </span>
                <span class="text-[13px] truncate flex-1 min-w-0 transition-all duration-100" v-html="highlightMatch(comp.fullName)" />
                <GlassBadge variant="purple" size="sm" class="shrink-0">{{ comp.type }}</GlassBadge>
                <span v-if="comp.lastModified" class="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right">{{ formatDate(comp.lastModified) }}</span>
              </div>
            </template>
          </RecycleScroller>

          <!-- Plain list for small categories -->
          <div v-else class="relative flex flex-col gap-0.5 py-0.5">
            <div
              v-for="comp in category.components"
              :key="`${comp.type}:${comp.fullName}`"
              class="metadata-check-row flex items-center gap-2.5 px-4 pl-11 py-2 rounded-[16px] mx-1 cursor-pointer outline-none"
              role="checkbox"
              :aria-checked="isSelected(comp)"
              :aria-label="comp.fullName"
              tabindex="0"
              @click="toggleComponent(comp)"
              @keydown.space.prevent="toggleComponent(comp)"
              @keydown.enter.prevent="toggleComponent(comp)"
            >
              <span class="relative w-[18px] h-[18px] shrink-0" @click.stop="toggleComponent(comp)">
                <span
                  class="absolute inset-0 rounded-[5px] border-solid transition-all duration-100"
                  :class="isSelected(comp) ? 'border-[1.5px] border-[var(--color-primary)]' : 'border-[1.5px] border-[var(--glass-border-hover)]'"
                />
                <svg
                  v-if="isSelected(comp)"
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                  class="absolute inset-0 text-[var(--color-primary)] check-animated"
                >
                  <path d="M6 12L10 16L18 8" />
                </svg>
              </span>
              <span
                class="inline-grid text-[13px] truncate flex-1 min-w-0"
              >
                <span class="col-start-1 row-start-1 invisible font-semibold" aria-hidden="true">{{ comp.fullName }}</span>
                <span
                  class="col-start-1 row-start-1 transition-all duration-100"
                  :class="isSelected(comp) ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'"
                  v-html="highlightMatch(comp.fullName)"
                />
              </span>
              <GlassBadge variant="purple" size="sm" class="shrink-0">{{ comp.type }}</GlassBadge>
              <span v-if="comp.lastModified" class="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right">{{ formatDate(comp.lastModified) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom bar: selected count + preview -->
    <div
      v-if="selected.length > 0"
      class="border-t border-[var(--glass-border)]"
      style="background: var(--glass-bg); backdrop-filter: var(--glass-blur-light);"
    >
      <button
        class="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors"
        @click="showSelectedPreview = !showSelectedPreview"
      >
        <span class="text-sm font-medium text-[var(--text-primary)]">
          {{ selected.length }} component{{ selected.length !== 1 ? 's' : '' }} selected
        </span>
        <div class="flex items-center gap-2">
          <button
            class="text-xs text-[var(--color-error)]/70 hover:text-[var(--color-error)] transition-colors cursor-pointer"
            @click.stop="clearAll"
          >
            Clear all
          </button>
          <svg
            class="w-4 h-4 text-[var(--text-muted)] transition-transform duration-200"
            :class="showSelectedPreview ? 'rotate-180' : ''"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </div>
      </button>

      <!-- Selected items preview -->
      <div
        v-if="showSelectedPreview"
        class="max-h-48 overflow-y-auto border-t border-[var(--glass-border)]"
      >
        <div
          v-for="item in selected"
          :key="`sel-${item.type}:${item.fullName}`"
          class="flex items-center justify-between px-4 py-1.5 transition-colors"
          style="transition: background 0.15s;"
          @mouseover="(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'"
          @mouseleave="(e) => e.currentTarget.style.background = 'transparent'"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs text-[var(--text-primary)] truncate">{{ item.fullName }}</span>
            <span class="text-xs text-[var(--text-muted)] font-mono shrink-0">{{ item.type }}</span>
          </div>
          <button
            class="text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer shrink-0 ml-2"
            @click="removeSelected(item)"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* Row hover highlight with pill shape */
.metadata-check-row {
  transition: background 0.1s ease, color 0.1s ease;
}

.metadata-check-row:hover {
  background: var(--glass-bg-hover);
}

.metadata-check-row:hover span:not([class*="badge"]):not([class*="border"]):not([class*="invisible"]) {
  color: var(--text-primary);
}

.metadata-check-row:hover .border-\[var\(--glass-border-hover\)\] {
  border-color: var(--text-secondary);
}

.metadata-check-row:focus-visible {
  outline: 1px solid var(--color-primary);
  outline-offset: -1px;
}

/* Checked row gets subtle persistent bg */
.metadata-check-row[aria-checked="true"] {
  background: var(--color-primary-bg);
}
</style>
