<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCompare } from '../composables/useCompare.js'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'
import OrgDropdown from '../components/OrgDropdown.vue'
import GlassSkeleton from '../components/glass/GlassSkeleton.vue'

const router = useRouter()

const {
  sourceOrg, targetOrg, results, summary, loading, error, filter,
  selectedComponents, expandedKey, detailLoading, detailData, detailError,
  compare, fetchDetail, toggleSelect, selectAll, clearSelection,
  filteredResults, selectedComponentsQuery,
} = useCompare()

// Search, sort & group state
const searchQuery = ref('')
const sortBy = ref('name')
const collapsedGroups = ref(new Set())

// Reset UI state when new results load
watch(() => results.value, () => {
  collapsedGroups.value = new Set()
  searchQuery.value = ''
})

// Apply search filter + sort on top of status-filtered results
const processedResults = computed(() => {
  let items = [...filteredResults.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(c =>
      c.fullName.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    )
  }

  items.sort((a, b) => {
    if (sortBy.value === 'status') {
      const order = { new: 0, modified: 1, deleted: 2, unchanged: 3 }
      const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4)
      return diff !== 0 ? diff : a.fullName.localeCompare(b.fullName)
    }
    return a.fullName.localeCompare(b.fullName)
  })

  return items
})

// Group processed results by metadata type
const groupedResults = computed(() => {
  const groups = new Map()
  for (const c of processedResults.value) {
    if (!groups.has(c.type)) groups.set(c.type, [])
    groups.get(c.type).push(c)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, items]) => ({
      type,
      count: items.length,
      rows: items.map(c => {
        if (c.status === 'new') return { source: c, target: null, key: `${c.type}:${c.fullName}` }
        if (c.status === 'deleted') return { source: null, target: c, key: `${c.type}:${c.fullName}` }
        return { source: c, target: c, key: `${c.type}:${c.fullName}` }
      }),
    }))
})

const totalFilteredCount = computed(() => filteredResults.value.length)
const displayCount = computed(() => processedResults.value.length)

const selectableComponents = computed(() => {
  return processedResults.value.filter(c => c.status !== 'unchanged')
})

const selectionCount = computed(() => selectedComponents.value.size)

const hasDeletedSelected = computed(() => {
  if (!results.value?.deleted) return false
  for (const key of selectedComponents.value) {
    const [type, ...nameParts] = key.split(':')
    const name = nameParts.join(':')
    if (results.value.deleted.some(d => d.type === type && d.fullName === name)) return true
  }
  return false
})

function toggleGroup(type) {
  const next = new Set(collapsedGroups.value)
  if (next.has(type)) next.delete(type)
  else next.add(type)
  collapsedGroups.value = next
}

function isGroupExpanded(type) {
  return !collapsedGroups.value.has(type)
}

function isSelected(type, fullName) {
  return selectedComponents.value.has(`${type}:${fullName}`)
}

function isExpanded(type, fullName) {
  return expandedKey.value === `${type}:${fullName}`
}

function onRowClick(row) {
  const c = row.source || row.target
  if (c.status === 'unchanged') return
  fetchDetail(c.type, c.fullName)
}

function runCompare() {
  if (!sourceOrg.value || !targetOrg.value) return
  compare(sourceOrg.value, targetOrg.value)
}

function navigateToWizard() {
  router.push({
    path: '/deploy',
    query: {
      fromCompare: 'true',
      source: sourceOrg.value,
      target: targetOrg.value,
      components: selectedComponentsQuery.value,
    },
  })
}

function statusTextColor(status) {
  switch (status) {
    case 'new': return 'text-[var(--color-success)]'
    case 'modified': return 'text-[var(--color-warning)]'
    case 'deleted': return 'text-[var(--color-error)]'
    default: return 'text-[var(--text-muted)]'
  }
}

function statusSymbol(status) {
  switch (status) {
    case 'new': return '+'
    case 'modified': return '~'
    case 'deleted': return '\u00d7'
    default: return '='
  }
}

const filterOptions = [
  { value: 'changes', label: 'Changes' },
  { value: 'new', label: 'New' },
  { value: 'modified', label: 'Modified' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'all', label: 'All' },
]

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
]
</script>

<template>
  <div class="h-[calc(100vh-3.5rem)] flex flex-col">

    <!-- Header: Org Selection -->
    <div class="border-b border-[var(--glass-border)] p-6" style="background: var(--glass-bg);">
      <div class="max-w-5xl mx-auto">
        <div class="mb-4">
          <h1 class="text-3xl font-semibold tracking-tight text-[var(--text-primary)]" style="text-wrap: balance">Compare Orgs</h1>
          <p class="text-sm text-[var(--text-secondary)]">Side-by-side metadata diff between two Salesforce orgs</p>
        </div>
        <div class="flex items-end gap-4">
          <div class="flex-1">
            <OrgDropdown v-model="sourceOrg" label="Source Org" :exclude="targetOrg" />
          </div>
          <div class="pb-2.5 text-[var(--text-muted)] font-light text-lg">&rarr;</div>
          <div class="flex-1">
            <OrgDropdown v-model="targetOrg" label="Target Org" :exclude="sourceOrg" />
          </div>
          <GlassButton
            variant="primary"
            :disabled="!sourceOrg || !targetOrg || loading"
            :loading="loading"
            class="mb-0"
            @click="runCompare"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z" />
            </svg>
            Compare
          </GlassButton>
        </div>
        <p v-if="sourceOrg && targetOrg && sourceOrg === targetOrg" class="mt-2 text-sm text-[var(--color-error)]">
          Select two different orgs to compare.
        </p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden flex flex-col">

      <!-- Loading skeleton -->
      <div v-if="loading" class="flex-1 grid grid-cols-2 gap-4">
        <div v-for="n in 2" :key="n" class="glass p-5 space-y-4">
          <GlassSkeleton variant="line" width="120px" height="18px" />
          <div v-for="m in 6" :key="m" class="flex items-center gap-3">
            <GlassSkeleton variant="line" width="16px" height="16px" rounded="var(--radius-sm)" />
            <GlassSkeleton variant="line" :width="m % 2 === 0 ? '70%' : '55%'" height="14px" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-center justify-center flex-1 p-8">
        <GlassCard padding="md" class="max-w-md w-full text-center">
          <svg class="w-8 h-8 text-[var(--color-error)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p class="text-sm font-medium text-[var(--text-primary)] mb-1">Comparison failed</p>
          <p class="text-sm text-[var(--text-muted)]">{{ error }}</p>
          <GlassButton variant="secondary" size="sm" class="mt-4" @click="runCompare">
            Try again
          </GlassButton>
        </GlassCard>
      </div>

      <!-- Empty state: no comparison run yet -->
      <div v-else-if="!results" class="flex items-center justify-center flex-1">
        <div class="text-center space-y-3">
          <svg class="w-12 h-12 text-[var(--text-muted)] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z" />
          </svg>
          <p class="text-sm text-[var(--text-muted)]">Select two orgs and click Compare to see differences.</p>
        </div>
      </div>

      <!-- Results -->
      <template v-else>

        <!-- Toolbar: Summary + Search + Filters + Sort -->
        <div class="border-b border-[var(--glass-border)] px-6 py-3 space-y-3" style="background: var(--background);">
          <!-- Row 1: Badges + Search -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 flex-wrap">
              <GlassBadge variant="success" size="md">{{ summary?.new ?? 0 }} new</GlassBadge>
              <GlassBadge variant="warning" size="md">{{ summary?.modified ?? 0 }} modified</GlassBadge>
              <GlassBadge variant="error" size="md">{{ summary?.deleted ?? 0 }} deleted</GlassBadge>
              <GlassBadge variant="info" size="md">{{ summary?.unchanged ?? 0 }} unchanged</GlassBadge>
              <span v-if="summary?.skippedTypes" class="text-xs text-[var(--text-muted)]">
                &middot; {{ summary.skippedTypes }} types skipped
              </span>
            </div>
            <div class="flex-1" />
            <!-- Search -->
            <div class="relative">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search components&hellip;"
                class="w-56 pl-8 pr-3 py-1.5 text-sm rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-primary-border)] focus:shadow-[0_0_8px_var(--color-primary-glow)] focus:w-72"
              />
            </div>
          </div>

          <!-- Row 2: Filters + Sort + Count + Select -->
          <div class="flex items-center gap-3">
            <!-- Filter pills -->
            <div class="flex items-center gap-1.5">
              <button
                v-for="opt in filterOptions"
                :key="opt.value"
                class="px-3 py-1 text-xs font-medium rounded-full border transition-all duration-150"
                :class="
                  filter === opt.value
                    ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary-border)] text-[var(--color-primary)]'
                    : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--text-primary)]'
                "
                @click="filter = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>

            <div class="w-px h-4 bg-[var(--glass-border)]" />

            <!-- Sort pills -->
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-[var(--text-muted)]">Sort:</span>
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                class="px-2.5 py-1 text-xs font-medium rounded-full border transition-all duration-150"
                :class="
                  sortBy === opt.value
                    ? 'bg-[var(--color-primary-bg)] border-[var(--color-primary-border)] text-[var(--color-primary)]'
                    : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--color-primary-border)] hover:text-[var(--text-primary)]'
                "
                @click="sortBy = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>

            <div class="flex-1" />

            <!-- Result count -->
            <span class="text-xs text-[var(--text-muted)]">
              Showing {{ displayCount }}<template v-if="displayCount !== totalFilteredCount"> of {{ totalFilteredCount }}</template>
            </span>

            <!-- Select all / clear -->
            <div v-if="selectableComponents.length > 0" class="flex items-center gap-2">
              <GlassButton variant="ghost" size="sm" @click="selectAll(selectableComponents)">
                Select all
              </GlassButton>
              <GlassButton v-if="selectionCount > 0" variant="ghost" size="sm" @click="clearSelection">
                Clear
              </GlassButton>
            </div>
          </div>
        </div>

        <!-- Empty after search/filter -->
        <div v-if="processedResults.length === 0" class="flex items-center justify-center flex-1 p-8">
          <div class="text-center space-y-2">
            <template v-if="searchQuery">
              <svg class="w-10 h-10 text-[var(--text-muted)] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <p class="text-sm font-medium text-[var(--text-primary)]">No components match &ldquo;{{ searchQuery }}&rdquo;</p>
              <GlassButton variant="ghost" size="sm" class="mt-2" @click="searchQuery = ''">Clear search</GlassButton>
            </template>
            <template v-else>
              <svg class="w-10 h-10 text-[var(--color-success)] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm font-medium text-[var(--text-primary)]">
                {{ filter === 'changes' || filter === 'all' ? 'These orgs are in sync! No differences found.' : 'No components match this filter.' }}
              </p>
            </template>
          </div>
        </div>

        <!-- Side-by-side grid with type groups -->
        <div v-else class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-2">

            <!-- Sticky column headers (opaque background) -->
            <div class="sticky top-0 z-20 flex items-center gap-2 px-4 py-2.5 border-b border-r border-[var(--glass-border)]" style="background: var(--background);">
              <svg class="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16l-4-4h2.5V4h3v8H16l-4 4zM4 18h16v2H4v-2z" />
              </svg>
              <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Source</span>
              <span class="ml-1 text-sm font-medium text-[var(--text-primary)]">{{ sourceOrg }}</span>
            </div>
            <div class="sticky top-0 z-20 flex items-center gap-2 px-4 py-2.5 border-b border-[var(--glass-border)]" style="background: var(--background);">
              <svg class="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8l4 4h-2.5v8h-3v-8H8l4-4zM4 4h16v2H4V4z" />
              </svg>
              <span class="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Target</span>
              <span class="ml-1 text-sm font-medium text-[var(--text-primary)]">{{ targetOrg }}</span>
            </div>

            <!-- Type groups -->
            <template v-for="group in groupedResults" :key="group.type">

              <!-- Group header (spans both columns) -->
              <div
                class="col-span-2 flex items-center gap-2 px-4 py-2 border-b border-[var(--glass-border)] cursor-pointer select-none hover:bg-[var(--glass-bg-hover)] transition-colors duration-100"
                style="background: var(--glass-bg);"
                @click="toggleGroup(group.type)"
              >
                <svg
                  class="w-3 h-3 text-[var(--text-muted)] transition-transform duration-200"
                  :class="isGroupExpanded(group.type) ? 'rotate-90' : ''"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
                <span class="text-sm font-medium text-[var(--text-primary)]">{{ group.type }}</span>
                <span class="text-xs text-[var(--text-muted)] tabular-nums">{{ group.count }}</span>
              </div>

              <!-- Group rows (visible when expanded) -->
              <template v-if="isGroupExpanded(group.type)">
                <template v-for="row in group.rows" :key="row.key">

                  <!-- Source cell -->
                  <div
                    class="flex items-center gap-2 px-4 py-2.5 border-b border-r border-[var(--glass-border)] transition-colors duration-100"
                    :class="[
                      row.source && row.source.status !== 'unchanged' ? 'cursor-pointer hover:bg-[var(--glass-bg-hover)]' : '',
                      row.source && isExpanded(row.source.type, row.source.fullName) ? 'bg-[var(--glass-bg-hover)]' : '',
                    ]"
                    @click="row.source && row.source.status !== 'unchanged' && onRowClick(row)"
                  >
                    <template v-if="row.source">
                      <!-- Checkbox -->
                      <button
                        v-if="row.source.status !== 'unchanged'"
                        class="flex-shrink-0 w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center"
                        :class="
                          isSelected(row.source.type, row.source.fullName)
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'border-[var(--glass-border)] hover:border-[var(--color-primary-border)]'
                        "
                        @click.stop="toggleSelect(row.source.type, row.source.fullName)"
                      >
                        <svg v-if="isSelected(row.source.type, row.source.fullName)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                      <div v-else class="flex-shrink-0 w-4 h-4" />

                      <!-- Status symbol -->
                      <span
                        class="flex-shrink-0 w-4 text-center text-sm font-bold font-mono"
                        :class="statusTextColor(row.source.status)"
                      >{{ statusSymbol(row.source.status) }}</span>

                      <!-- Name -->
                      <span
                        class="flex-1 min-w-0 text-sm truncate"
                        :class="row.source.status === 'unchanged' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'"
                      >{{ row.source.fullName }}</span>

                      <!-- Expand chevron -->
                      <svg
                        v-if="row.source.status !== 'unchanged'"
                        class="flex-shrink-0 w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200"
                        :class="isExpanded(row.source.type, row.source.fullName) ? 'rotate-180' : ''"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </template>
                  </div>

                  <!-- Target cell -->
                  <div
                    class="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--glass-border)] transition-colors duration-100"
                    :class="[
                      row.target && row.target.status !== 'unchanged' ? 'cursor-pointer hover:bg-[var(--glass-bg-hover)]' : '',
                      row.target && isExpanded(row.target.type, row.target.fullName) ? 'bg-[var(--glass-bg-hover)]' : '',
                    ]"
                    @click="row.target && row.target.status !== 'unchanged' && row.source === null && onRowClick(row)"
                  >
                    <template v-if="row.target">
                      <!-- Checkbox for deleted -->
                      <button
                        v-if="row.source === null && row.target.status === 'deleted'"
                        class="flex-shrink-0 w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center"
                        :class="
                          isSelected(row.target.type, row.target.fullName)
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'border-[var(--glass-border)] hover:border-[var(--color-primary-border)]'
                        "
                        @click.stop="toggleSelect(row.target.type, row.target.fullName)"
                      >
                        <svg v-if="isSelected(row.target.type, row.target.fullName)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      </button>
                      <div v-else class="flex-shrink-0 w-4 h-4" />

                      <!-- Status symbol -->
                      <span
                        class="flex-shrink-0 w-4 text-center text-sm font-bold font-mono"
                        :class="statusTextColor(row.target.status)"
                      >{{ statusSymbol(row.target.status) }}</span>

                      <!-- Name -->
                      <span
                        class="flex-1 min-w-0 text-sm truncate"
                        :class="row.target.status === 'unchanged' ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'"
                      >{{ row.target.fullName }}</span>

                      <!-- Expand chevron for deleted-only rows -->
                      <svg
                        v-if="row.source === null && row.target.status !== 'unchanged'"
                        class="flex-shrink-0 w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200"
                        :class="isExpanded(row.target.type, row.target.fullName) ? 'rotate-180' : ''"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </template>
                  </div>

                  <!-- Expanded detail panel (col-span-2) -->
                  <Transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[400px]"
                    leave-active-class="transition-all duration-150 ease-in"
                    leave-from-class="opacity-100 max-h-[400px]"
                    leave-to-class="opacity-0 max-h-0"
                  >
                    <div
                      v-if="isExpanded((row.source || row.target).type, (row.source || row.target).fullName)"
                      class="col-span-2 overflow-hidden border-b border-[var(--glass-border)]"
                      style="background: var(--glass-bg);"
                    >
                      <!-- Loading detail -->
                      <div v-if="detailLoading" class="flex items-center gap-2 px-6 py-4 text-sm text-[var(--text-muted)]">
                        <div class="w-4 h-4 border border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        Loading property details&hellip;
                      </div>

                      <!-- Detail error -->
                      <div v-else-if="detailError" class="px-6 py-4 text-sm text-[var(--color-error)]">
                        {{ detailError }}
                      </div>

                      <!-- Detail data -->
                      <div v-else-if="detailData" class="p-4">
                        <!-- Diffs summary -->
                        <div v-if="detailData.diffs && detailData.diffs.length > 0" class="mb-3">
                          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                            {{ detailData.diffs.length }} propert{{ detailData.diffs.length === 1 ? 'y' : 'ies' }} differ
                          </p>
                          <div class="flex flex-wrap gap-2">
                            <span
                              v-for="diff in detailData.diffs"
                              :key="diff.property"
                              class="text-xs px-2 py-0.5 rounded border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                            >
                              {{ diff.property }}
                            </span>
                          </div>
                        </div>

                        <!-- Side-by-side property tables -->
                        <div class="grid grid-cols-2 gap-4">
                          <!-- Source props -->
                          <div>
                            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{{ sourceOrg }}</p>
                            <div v-if="detailData.source?.error" class="text-xs text-[var(--text-muted)] italic">{{ detailData.source.error }}</div>
                            <div v-else class="space-y-1">
                              <div
                                v-for="(val, key) in detailData.source"
                                :key="key"
                                class="flex gap-2 text-xs rounded px-2 py-1"
                                :class="detailData.diffs?.some(d => d.property === key) ? 'bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]' : ''"
                              >
                                <span class="font-medium text-[var(--text-secondary)] w-28 flex-shrink-0">{{ key }}</span>
                                <span class="text-[var(--text-primary)] font-mono break-all">{{ val }}</span>
                              </div>
                            </div>
                          </div>

                          <!-- Target props -->
                          <div>
                            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{{ targetOrg }}</p>
                            <div v-if="detailData.target?.error" class="text-xs text-[var(--text-muted)] italic">{{ detailData.target.error }}</div>
                            <div v-else class="space-y-1">
                              <div
                                v-for="(val, key) in detailData.target"
                                :key="key"
                                class="flex gap-2 text-xs rounded px-2 py-1"
                                :class="detailData.diffs?.some(d => d.property === key) ? 'bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]' : ''"
                              >
                                <span class="font-medium text-[var(--text-secondary)] w-28 flex-shrink-0">{{ key }}</span>
                                <span class="text-[var(--text-primary)] font-mono break-all">{{ val }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Transition>

                </template>
              </template>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- Floating action bar -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="selectionCount > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] px-5 py-3 shadow-2xl z-50"
        style="background: var(--nav-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);"
      >
        <!-- Selection count -->
        <span class="flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
          <span class="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center font-semibold">{{ selectionCount }}</span>
          selected
        </span>

        <div class="w-px h-5 bg-[var(--glass-border)]" />

        <!-- Deleted warning -->
        <span v-if="hasDeletedSelected" class="text-xs text-[var(--color-warning)]">
          Deploying will not remove deleted components
        </span>

        <!-- Send to wizard -->
        <GlassButton variant="primary" size="sm" @click="navigateToWizard">
          Send to Wizard
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </GlassButton>

        <!-- Clear selection -->
        <GlassButton variant="ghost" size="sm" @click="clearSelection">
          Clear
        </GlassButton>
      </div>
    </Transition>

  </div>
</template>
