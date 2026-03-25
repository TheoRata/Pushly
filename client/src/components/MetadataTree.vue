<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useMetadata } from '../composables/useMetadata'
import { useApi } from '../composables/useApi'

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
  search,
  toggleRecentlyModified,
} = useMetadata()

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
  return `${before}<mark class="bg-[var(--color-primary)]/30 text-[var(--color-primary)] rounded px-0.5">${match}</mark>${after}`
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
  <div class="flex flex-col h-full bg-[var(--bg-primary)] rounded-lg overflow-hidden">
    <!-- Search bar + controls -->
    <div class="p-3 border-b border-white/5">
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
            class="w-full pl-10 pr-3 py-2 text-sm bg-[var(--bg-surface)] border border-white/10 rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            :value="searchQuery"
            @input="onSearchInput"
          />
        </div>

        <!-- Recently Modified toggle -->
        <button
          class="px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap"
          :class="
            recentOnly
              ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
              : 'bg-[var(--bg-surface)] border-white/10 text-[var(--text-secondary)] hover:bg-white/5'
          "
          @click="toggleRecentlyModified"
        >
          <svg class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Recent
        </button>
      </div>

      <!-- Bundle controls -->
      <div class="flex items-center gap-2 mt-2">
        <!-- Save as Bundle -->
        <div class="relative">
          <button
            class="px-2.5 py-1.5 text-xs font-medium rounded-md bg-[var(--bg-surface)] border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="selected.length === 0"
            @click="showBundleSave = !showBundleSave"
          >
            Save Bundle
          </button>
          <!-- Save input dropdown -->
          <div
            v-if="showBundleSave"
            class="absolute top-full left-0 mt-1 p-2 bg-[var(--bg-elevated)] border border-white/10 rounded-lg shadow-xl z-20 min-w-[200px]"
          >
            <input
              v-model="bundleName"
              type="text"
              placeholder="Bundle name..."
              class="w-full px-2.5 py-1.5 text-xs bg-[var(--bg-surface)] border border-white/10 rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--color-primary)]/50 mb-2"
              @keydown.enter="saveBundle"
            />
            <div class="flex gap-1.5">
              <button
                class="flex-1 px-2 py-1 text-xs font-medium rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
                @click="saveBundle"
              >
                Save
              </button>
              <button
                class="px-2 py-1 text-xs font-medium rounded-md bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
                @click="showBundleSave = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Load Bundle -->
        <div class="relative">
          <button
            class="px-2.5 py-1.5 text-xs font-medium rounded-md bg-[var(--bg-surface)] border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="bundles.length === 0"
            @click="showBundleDropdown = !showBundleDropdown"
          >
            Load Bundle
            <svg class="w-3 h-3 inline-block ml-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <!-- Bundle list dropdown -->
          <div
            v-if="showBundleDropdown"
            class="absolute top-full left-0 mt-1 bg-[var(--bg-elevated)] border border-white/10 rounded-lg shadow-xl z-20 min-w-[200px] max-h-48 overflow-y-auto"
          >
            <div
              v-for="bundle in bundles"
              :key="bundle.name"
              class="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer group"
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

      <div v-for="category in filteredCategories" :key="category.name" class="border-b border-white/5 last:border-b-0">
        <!-- Category header -->
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/80 transition-colors cursor-pointer text-left sticky top-0 z-10"
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
            class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            :class="
              categoryCheckState(category) === 'all'
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                : categoryCheckState(category) === 'some'
                  ? 'bg-[var(--color-primary)]/50 border-[var(--color-primary)]'
                  : 'border-white/20'
            "
            @click.stop="toggleCategory(category)"
          >
            <svg
              v-if="categoryCheckState(category) !== 'none'"
              class="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="3"
            >
              <path
                v-if="categoryCheckState(category) === 'all'"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
              <path
                v-else
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M5 12h14"
              />
            </svg>
          </span>

          <!-- Category name -->
          <span class="text-sm font-medium text-[var(--text-primary)] flex-1">
            {{ category.name }}
          </span>

          <!-- Count badge -->
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
            {{ category.components.length }}
          </span>

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
          class="bg-[var(--bg-primary)]"
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
            :item-size="36"
            :key-field="null"
            class="scroller"
            :style="{ height: Math.min(category.components.length * 36, 360) + 'px' }"
          >
            <template #default="{ item: comp }">
              <div
                class="flex items-center gap-3 px-4 pl-11 h-[36px] hover:bg-white/[0.03] cursor-pointer transition-colors"
                @click="toggleComponent(comp)"
              >
                <span
                  class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                  :class="isSelected(comp) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-white/20'"
                >
                  <svg v-if="isSelected(comp)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
                <span class="text-sm text-[var(--text-primary)] truncate flex-1 min-w-0" v-html="highlightMatch(comp.fullName)" />
                <span class="text-[10px] font-mono text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded shrink-0">{{ comp.type }}</span>
                <span v-if="comp.lastModified" class="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right">{{ formatDate(comp.lastModified) }}</span>
              </div>
            </template>
          </RecycleScroller>

          <!-- Plain list for small categories -->
          <template v-else>
            <div
              v-for="comp in category.components"
              :key="`${comp.type}:${comp.fullName}`"
              class="flex items-center gap-3 px-4 pl-11 py-2 hover:bg-white/[0.03] cursor-pointer transition-colors"
              @click="toggleComponent(comp)"
            >
              <span
                class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                :class="isSelected(comp) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-white/20'"
              >
                <svg v-if="isSelected(comp)" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
              <span class="text-sm text-[var(--text-primary)] truncate flex-1 min-w-0" v-html="highlightMatch(comp.fullName)" />
              <span class="text-[10px] font-mono text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded shrink-0">{{ comp.type }}</span>
              <span v-if="comp.lastModified" class="text-xs text-[var(--text-muted)] shrink-0 w-16 text-right">{{ formatDate(comp.lastModified) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Bottom bar: selected count + preview -->
    <div
      v-if="selected.length > 0"
      class="border-t border-white/10 bg-[var(--bg-surface)]"
    >
      <button
        class="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer"
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
        class="max-h-48 overflow-y-auto border-t border-white/5"
      >
        <div
          v-for="item in selected"
          :key="`sel-${item.type}:${item.fullName}`"
          class="flex items-center justify-between px-4 py-1.5 hover:bg-white/[0.03]"
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
