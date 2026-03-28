<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  categories: { type: Array, required: true },
  activeCategory: { type: String, default: null },
  selectedComponents: { type: Array, default: () => [] },
  searchMatchCounts: { type: Map, default: () => new Map() },
  isSearching: { type: Boolean, default: false },
})

const emit = defineEmits([
  'select-category',
  'toggle-all-category',
  'remove-component',
  'clear-all',
  'navigate-to-component',
])

const activeTab = ref('categories')
const collapsed = ref(false)

// Total component count across all categories
const totalCount = computed(() =>
  props.categories.reduce((sum, cat) => sum + (cat.components?.length || 0), 0)
)

// Per-category selection count
function selectionCount(category) {
  return props.selectedComponents.filter(
    (s) => category.components?.some((c) => c.fullName === s.fullName && c.type === s.type)
  ).length
}

// Selected components grouped by category name
const selectedByCategory = computed(() => {
  const groups = {}
  for (const cat of props.categories) {
    const items = props.selectedComponents.filter(
      (s) => cat.components?.some((c) => c.fullName === s.fullName && c.type === s.type)
    )
    if (items.length > 0) {
      groups[cat.name] = items
    }
  }
  return groups
})

// Category initial(s): up to 2 chars from first letters of words
function categoryInitial(name) {
  const words = name.split(/[\s_/-]+/).filter(Boolean)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function handleCategoryClick(categoryName) {
  if (collapsed.value) {
    collapsed.value = false
    emit('select-category', categoryName)
    return
  }
  // Clicking active category deselects (goes to All)
  if (props.activeCategory === categoryName) {
    emit('select-category', null)
  } else {
    emit('select-category', categoryName)
  }
}

function isAllSelected(category) {
  if (!category.components || category.components.length === 0) return false
  return category.components.every((c) =>
    props.selectedComponents.some((s) => s.fullName === c.fullName && s.type === c.type)
  )
}
</script>

<template>
  <!-- Collapsed state -->
  <div
    v-if="collapsed"
    class="flex flex-col h-full border-r"
    style="width: 48px; background: rgba(255,255,255,0.015); border-color: var(--glass-border);"
  >
    <!-- Expand button -->
    <button
      class="h-9 flex items-center justify-center cursor-pointer transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      style="border-bottom: 1px solid var(--glass-border);"
      title="Expand sidebar"
      @click="collapsed = false"
    >
      <span class="text-[11px] font-medium">&gt;&gt;</span>
    </button>

    <!-- Category initials -->
    <div class="flex-1 overflow-y-auto py-1">
      <!-- All -->
      <button
        class="relative w-full h-8 flex items-center justify-center cursor-pointer transition-all"
        :style="activeCategory === null
          ? 'background: var(--color-primary); color: white;'
          : 'color: var(--text-muted);'"
        title="All"
        @click="emit('select-category', null)"
      >
        <span class="text-[10px] font-bold">ALL</span>
      </button>

      <button
        v-for="cat in categories"
        :key="cat.name"
        class="relative w-full h-8 flex items-center justify-center cursor-pointer transition-all"
        :style="activeCategory === cat.name
          ? 'background: var(--color-primary); color: white;'
          : 'color: var(--text-muted);'"
        :title="cat.name"
        @click="handleCategoryClick(cat.name)"
      >
        <span class="text-[10px] font-bold leading-none">{{ categoryInitial(cat.name) }}</span>
        <!-- Selection dot -->
        <span
          v-if="selectionCount(cat) > 0 && activeCategory !== cat.name"
          class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
          style="background: var(--color-primary);"
        />
      </button>
    </div>
  </div>

  <!-- Expanded state -->
  <div
    v-else
    class="flex flex-col h-full border-r"
    style="width: 200px; background: rgba(255,255,255,0.015); border-color: var(--glass-border);"
  >
    <!-- Tab bar -->
    <div
      class="flex shrink-0"
      style="border-bottom: 1px solid var(--glass-border);"
    >
      <button
        class="flex-1 py-2 text-[11px] font-medium cursor-pointer transition-colors"
        :style="activeTab === 'categories'
          ? 'color: var(--color-primary); border-bottom: 2px solid var(--color-primary);'
          : 'color: var(--text-muted); border-bottom: 2px solid transparent;'"
        @click="activeTab = 'categories'"
      >
        Categories
      </button>
      <button
        class="flex-1 py-2 text-[11px] font-medium cursor-pointer transition-colors"
        :style="activeTab === 'selected'
          ? 'color: var(--color-primary); border-bottom: 2px solid var(--color-primary);'
          : 'color: var(--text-muted); border-bottom: 2px solid transparent;'"
        @click="activeTab = 'selected'"
      >
        Selected ({{ selectedComponents.length }})
      </button>
    </div>

    <!-- CATEGORIES TAB -->
    <div v-if="activeTab === 'categories'" class="flex flex-col flex-1 min-h-0">
      <div class="flex-1 overflow-y-auto">
        <!-- All option -->
        <button
          class="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left cursor-pointer transition-all"
          :style="activeCategory === null
            ? 'background: var(--color-primary); color: white;'
            : 'color: var(--text-secondary);'"
          @click="emit('select-category', null)"
          @mouseover="(e) => { if (activeCategory !== null) e.currentTarget.style.background = 'var(--glass-bg-hover)' }"
          @mouseleave="(e) => { if (activeCategory !== null) e.currentTarget.style.background = '' }"
        >
          <span class="text-[12px] font-medium truncate flex-1">All</span>
          <span
            class="text-[10px] shrink-0"
            :style="activeCategory === null ? 'color: rgba(255,255,255,0.7)' : 'color: var(--text-muted)'"
          >{{ totalCount }}</span>
        </button>

        <!-- Category rows -->
        <button
          v-for="cat in categories"
          :key="cat.name"
          class="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left cursor-pointer transition-all"
          :style="[
            activeCategory === cat.name
              ? 'background: var(--color-primary); color: white;'
              : isSearching && (searchMatchCounts.get(cat.name) || 0) === 0
                ? 'opacity: 0.4; color: var(--text-secondary);'
                : 'color: var(--text-secondary);'
          ]"
          @click="handleCategoryClick(cat.name)"
          @mouseover="(e) => { if (activeCategory !== cat.name) e.currentTarget.style.background = 'var(--glass-bg-hover)' }"
          @mouseleave="(e) => { if (activeCategory !== cat.name) e.currentTarget.style.background = '' }"
        >
          <!-- Name -->
          <span class="text-[12px] font-medium truncate flex-1">{{ cat.name }}</span>

          <!-- Selection count pill -->
          <span
            v-if="selectionCount(cat) > 0"
            class="shrink-0 px-1 rounded text-[10px] font-bold leading-[16px]"
            :style="activeCategory === cat.name
              ? 'background: rgba(255,255,255,0.25); color: white;'
              : 'background: var(--color-primary-bg); color: var(--color-primary);'"
          >{{ selectionCount(cat) }}</span>

          <!-- Total / match count -->
          <span
            class="text-[10px] shrink-0"
            :style="activeCategory === cat.name ? 'color: rgba(255,255,255,0.7)' : 'color: var(--text-muted)'"
          >
            <template v-if="isSearching && searchMatchCounts.has(cat.name)">
              {{ searchMatchCounts.get(cat.name) }}
            </template>
            <template v-else>
              {{ cat.components?.length || 0 }}
            </template>
          </span>
        </button>
      </div>

      <!-- Bottom bar -->
      <div
        class="shrink-0 flex items-center gap-1 px-2 py-1.5"
        style="border-top: 1px solid var(--glass-border);"
      >
        <!-- Select all checkbox (only when a category is active) -->
        <template v-if="activeCategory !== null">
          <button
            class="flex items-center gap-1.5 flex-1 cursor-pointer group"
            @click="emit('toggle-all-category', activeCategory)"
          >
            <span
              class="relative w-[14px] h-[14px] shrink-0 rounded-[3px] border-[1.5px] transition-all"
              :style="isAllSelected(categories.find(c => c.name === activeCategory))
                ? 'border-color: var(--color-primary); background: var(--color-primary);'
                : 'border-color: var(--glass-border-hover);'"
            >
              <svg
                v-if="isAllSelected(categories.find(c => c.name === activeCategory))"
                class="absolute inset-0 text-white"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
              >
                <path d="M6 12L10 16L18 8" />
              </svg>
            </span>
            <span class="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors truncate">
              Select all
            </span>
          </button>
        </template>
        <div v-else class="flex-1" />

        <!-- Collapse button -->
        <button
          class="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors px-1"
          title="Collapse sidebar"
          @click="collapsed = true"
        >
          «
        </button>
      </div>
    </div>

    <!-- SELECTED TAB -->
    <div v-else class="flex flex-col flex-1 min-h-0">
      <!-- Empty state -->
      <div
        v-if="selectedComponents.length === 0"
        class="flex-1 flex items-center justify-center"
      >
        <span class="text-[11px] text-[var(--text-muted)] text-center px-3">No components selected</span>
      </div>

      <!-- Grouped list -->
      <div v-else class="flex-1 overflow-y-auto py-1">
        <template v-for="(items, catName) in selectedByCategory" :key="catName">
          <!-- Category header -->
          <div
            class="px-2.5 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider"
            style="color: var(--color-primary);"
          >
            {{ catName }}
          </div>
          <!-- Items -->
          <div
            v-for="item in items"
            :key="`${item.type}:${item.fullName}`"
            class="flex items-center gap-1 px-2.5 py-1 group cursor-pointer"
            style="transition: background 0.1s;"
            @mouseover="(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'"
            @mouseleave="(e) => e.currentTarget.style.background = ''"
          >
            <span
              class="text-[11px] text-[var(--text-secondary)] truncate flex-1 min-w-0 hover:text-[var(--text-primary)]"
              @click="emit('navigate-to-component', item)"
            >{{ item.fullName }}</span>
            <button
              class="shrink-0 text-[var(--text-muted)] hover:text-[var(--color-error)] cursor-pointer transition-colors"
              style="opacity: 0.5;"
              @mouseover="(e) => e.currentTarget.style.opacity = '1'"
              @mouseleave="(e) => e.currentTarget.style.opacity = '0.5'"
              @click.stop="emit('remove-component', item)"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </template>
      </div>

      <!-- Clear all button -->
      <div
        v-if="selectedComponents.length > 0"
        class="shrink-0 px-2.5 py-2"
        style="border-top: 1px solid var(--glass-border);"
      >
        <button
          class="w-full text-[11px] text-[var(--color-error)]/60 hover:text-[var(--color-error)] transition-colors cursor-pointer"
          @click="emit('clear-all')"
        >
          Clear all selections
        </button>
      </div>
    </div>
  </div>
</template>
