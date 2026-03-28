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

// Total component count across all categories
const totalCount = computed(() =>
  props.categories.reduce((sum, cat) => sum + (cat.components?.length || 0), 0)
)

// Split categories: those with components vs empty
const populatedCategories = computed(() =>
  props.categories.filter(cat => (cat.components?.length || 0) > 0)
)
const emptyCategories = computed(() =>
  props.categories.filter(cat => (cat.components?.length || 0) === 0)
)
const showEmptyCategories = ref(false)

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

function handleCategoryClick(categoryName) {
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
  <div
    class="flex flex-col h-full border-r shrink-0"
    style="width: 200px; background: rgba(255,255,255,0.015); border-color: var(--glass-border);"
  >
    <!-- Tab bar — matches search bar height (px-3 py-2.5 = same as ComponentList search row) -->
    <div
      class="flex shrink-0 px-1 py-2.5 gap-1"
      style="border-bottom: 1px solid var(--glass-border);"
    >
      <button
        class="flex-1 py-1 text-[11px] font-medium cursor-pointer transition-colors rounded-md"
        :style="activeTab === 'categories'
          ? 'color: var(--color-primary); background: var(--color-primary-bg);'
          : 'color: var(--text-muted);'"
        @click="activeTab = 'categories'"
      >
        Categories
      </button>
      <button
        class="flex-1 py-1 text-[11px] font-medium cursor-pointer transition-colors rounded-md"
        :style="activeTab === 'selected'
          ? 'color: var(--color-primary); background: var(--color-primary-bg);'
          : 'color: var(--text-muted);'"
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

        <!-- Category rows (only categories with components) -->
        <button
          v-for="cat in populatedCategories"
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

        <!-- Empty categories collapsible group -->
        <template v-if="emptyCategories.length > 0 && !isSearching">
          <button
            class="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left cursor-pointer transition-all"
            style="color: var(--text-muted); border-top: 1px solid var(--glass-border); margin-top: 4px; padding-top: 8px;"
            @click="showEmptyCategories = !showEmptyCategories"
            @mouseover="(e) => e.currentTarget.style.background = 'var(--glass-bg-hover)'"
            @mouseleave="(e) => e.currentTarget.style.background = ''"
          >
            <svg
              class="w-3 h-3 shrink-0 transition-transform duration-200"
              :class="showEmptyCategories ? 'rotate-90' : ''"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span class="text-[11px] font-medium truncate flex-1">No Components</span>
            <span class="text-[10px] shrink-0">{{ emptyCategories.length }}</span>
          </button>
          <template v-if="showEmptyCategories">
            <button
              v-for="cat in emptyCategories"
              :key="cat.name"
              class="w-full flex items-center gap-1.5 px-2.5 py-1 pl-6 text-left cursor-pointer transition-all"
              :style="[
                activeCategory === cat.name
                  ? 'background: var(--color-primary); color: white;'
                  : 'color: var(--text-muted);'
              ]"
              @click="handleCategoryClick(cat.name)"
              @mouseover="(e) => { if (activeCategory !== cat.name) e.currentTarget.style.background = 'var(--glass-bg-hover)' }"
              @mouseleave="(e) => { if (activeCategory !== cat.name) e.currentTarget.style.background = '' }"
            >
              <span class="text-[11px] truncate flex-1">{{ cat.name }}</span>
              <span class="text-[10px] shrink-0">0</span>
            </button>
          </template>
        </template>
      </div>

      <!-- Bottom bar: Select all (no collapse button) -->
      <div
        v-if="activeCategory !== null"
        class="shrink-0 flex items-center gap-1 px-2 py-1.5"
        style="border-top: 1px solid var(--glass-border);"
      >
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
