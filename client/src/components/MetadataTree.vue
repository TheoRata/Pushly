<script setup>
import { ref, computed, watch } from 'vue'
import { useMetadata } from '../composables/useMetadata'
import CategorySidebar from './metadata/CategorySidebar.vue'
import ComponentList from './metadata/ComponentList.vue'
import StickyFooter from './metadata/StickyFooter.vue'

const props = defineProps({
  orgAlias: { type: String, required: true },
  modelValue: { type: Array, default: () => [] },
  showFooter: { type: Boolean, default: true },
  canProceed: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'back', 'next'])

const {
  categories,
  displayedComponents,
  loading,
  searchQuery,
  recentOnly,
  activeCategory,
  searchMatchCounts,
  loadMetadata,
  refreshAll,
  refreshTypes,
  search,
  setActiveCategory,
  toggleRecentlyModified,
} = useMetadata()

const refreshing = ref(false)

// Selection
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

function removeComponent(component) {
  const current = selected.value.filter(
    (s) => !(s.fullName === component.fullName && s.type === component.type)
  )
  emit('update:modelValue', current)
}

function toggleAllCategory(categoryName) {
  const category = categories.value.find((c) => c.name === categoryName)
  if (!category) return
  const allSelected = category.components.every((c) => isSelected(c))
  if (allSelected) {
    const filtered = selected.value.filter(
      (s) => !category.components.some((c) => c.fullName === s.fullName && c.type === s.type)
    )
    emit('update:modelValue', filtered)
  } else {
    const toAdd = category.components
      .filter((c) => !isSelected(c))
      .map((c) => ({ fullName: c.fullName, type: c.type }))
    emit('update:modelValue', [...selected.value, ...toAdd])
  }
}

function clearAll() {
  emit('update:modelValue', [])
}

function handleLoadBundle(components) {
  emit('update:modelValue', components)
}

function navigateToComponent(comp) {
  const owningCategory = categories.value.find((cat) =>
    cat.components.some((c) => c.fullName === comp.fullName && c.type === comp.type)
  )
  if (owningCategory) {
    setActiveCategory(owningCategory.name)
  }
}

async function handleRefreshAll() {
  refreshing.value = true
  try { await refreshAll() } catch {}
  refreshing.value = false
}

function getFieldsForObject(objectName) {
  const fields = []
  for (const cat of categories.value) {
    for (const comp of cat.components) {
      if (comp.type === 'CustomField' && comp.fullName.startsWith(objectName + '.')) {
        fields.push(comp)
      }
    }
  }
  return fields.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

async function handleRefreshOpen() {
  if (!activeCategory.value) return
  const category = categories.value.find((c) => c.name === activeCategory.value)
  if (!category) return
  const typeNames = category.types.map((t) => t.xmlName || t)
  refreshing.value = true
  try { await refreshTypes(typeNames) } catch {}
  refreshing.value = false
}

watch(
  () => props.orgAlias,
  (alias) => { if (alias) loadMetadata(alias) },
  { immediate: true }
)
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden" style="background: var(--glass-bg);">
    <!-- Main area: sidebar + component list -->
    <div class="flex flex-1 overflow-hidden">
      <CategorySidebar
        :categories="categories"
        :active-category="activeCategory"
        :selected-components="selected"
        :search-match-counts="searchMatchCounts"
        :is-searching="!!(searchQuery && searchQuery.trim())"
        @select-category="setActiveCategory"
        @toggle-all-category="toggleAllCategory"
        @remove-component="removeComponent"
        @clear-all="clearAll"
        @navigate-to-component="navigateToComponent"
      />
      <ComponentList
        :components="displayedComponents"
        :selected-components="selected"
        :search-query="searchQuery"
        :recent-only="recentOnly"
        :loading="loading"
        :refreshing="refreshing"
        :active-category="activeCategory"
        :org-alias="orgAlias"
        @search="search"
        @toggle-component="toggleComponent"
        @toggle-recent="toggleRecentlyModified"
        @refresh-all="handleRefreshAll"
        @refresh-open="handleRefreshOpen"
      />
    </div>
    <!-- Sticky Footer (conditional) -->
    <StickyFooter
      v-if="showFooter"
      :selected-count="selected.length"
      :selected-components="selected"
      :can-proceed="canProceed"
      @back="emit('back')"
      @next="emit('next')"
      @load-bundle="handleLoadBundle"
    />
  </div>
</template>
