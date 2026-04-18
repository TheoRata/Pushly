<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import ConfirmModal from '../components/ConfirmModal.vue'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'
import GlassToggle from '../components/glass/GlassToggle.vue'
import GlassPagination from '../components/glass/GlassPagination.vue'

const { get, post } = useApi()

// --- State ---
const records = ref([])
const loading = ref(false)
const error = ref(null)

// Search
const searchQuery = ref('')

// Filters
const filterUser = ref('')
const filterOrg = ref('')
const filterStatus = ref('all')
const filterRange = ref('30d')
const customFrom = ref('')
const customTo = ref('')
const showFilters = ref(false)

// Pagination
const currentPage = ref(1)
const ITEMS_PER_PAGE = 10

// Row expansion
const expandedRowId = ref(null)

// Rollback modal
const showRollbackModal = ref(false)
const rollbackTarget = ref(null)
const rollingBack = ref(false)

// --- Computed ---
const uniqueUsers = computed(() => {
  const users = new Set(records.value.map(r => r.user).filter(Boolean))
  return [...users].sort()
})

const uniqueOrgs = computed(() => {
  const orgs = new Set()
  records.value.forEach(r => {
    if (r.sourceOrg) orgs.add(r.sourceOrg)
    if (r.targetOrg) orgs.add(r.targetOrg)
  })
  return [...orgs].sort()
})

const uniqueStatuses = computed(() => {
  const statuses = new Set(records.value.map(r => r.status).filter(Boolean))
  return [...statuses].sort()
})

const filteredRecords = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return records.value.filter(r => {
    // Search
    if (query) {
      const matchSearch =
        (r.user || '').toLowerCase().includes(query) ||
        (r.sourceOrg || '').toLowerCase().includes(query) ||
        (r.targetOrg || '').toLowerCase().includes(query) ||
        (r.error || '').toLowerCase().includes(query) ||
        (r.name || '').toLowerCase().includes(query) ||
        operationLabel(r).toLowerCase().includes(query)
      if (!matchSearch) return false
    }
    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredRecords.value.length / ITEMS_PER_PAGE))

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredRecords.value.slice(start, start + ITEMS_PER_PAGE)
})

// Reset to page 1 when filters change
watch([searchQuery, filterUser, filterOrg, filterStatus, filterRange], () => {
  currentPage.value = 1
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filterUser.value) count++
  if (filterOrg.value) count++
  if (filterStatus.value !== 'all') count++
  if (filterRange.value !== '30d') count++
  return count
})

// --- Helpers ---
function getDateRange() {
  if (filterRange.value === 'custom') {
    return { from: customFrom.value || undefined, to: customTo.value || undefined }
  }
  const days = { '7d': 7, '30d': 30, '90d': 90 }[filterRange.value] || 30
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  return { from, to: undefined }
}

function relativeTime(dateStr) {
  if (!dateStr) return '-'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60)
    return `${m} minute${m !== 1 ? 's' : ''} ago`
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600)
    return `${h} hour${h !== 1 ? 's' : ''} ago`
  }
  const d = Math.floor(diffSec / 86400)
  return `${d} day${d !== 1 ? 's' : ''} ago`
}

function formatDuration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return '-'
  const ms = new Date(completedAt) - new Date(startedAt)
  if (ms < 1000) return `${ms}ms`
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  return `${min}m ${remSec}s`
}

function absoluteDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

function isProductionOrg(record) {
  const target = (record.targetOrg || '').toLowerCase()
  return target.includes('prod') || target === 'production'
}

function toggleRow(id) {
  expandedRowId.value = expandedRowId.value === id ? null : id
}

function operationLabel(record) {
  if (record.type === 'retrieve') return 'Retrieve'
  if (record.type === 'rollback') return 'Rollback'
  return 'Deploy'
}

function operationBadgeVariant(record) {
  if (record.type === 'retrieve') return 'info'
  if (record.type === 'rollback') return 'warning'
  return 'purple'
}

function orgFlow(record) {
  if (record.type === 'retrieve') return { source: record.sourceOrg || '-', target: 'Local' }
  if (record.type === 'deploy' || record.type === 'rollback') return { source: 'Local', target: record.targetOrg || '-' }
  return { source: record.sourceOrg || '-', target: record.targetOrg || '-' }
}

function clearFilters() {
  filterUser.value = ''
  filterOrg.value = ''
  filterStatus.value = 'all'
  filterRange.value = '30d'
  customFrom.value = ''
  customTo.value = ''
}

function toggleFilterValue(category, value) {
  if (category === 'user') filterUser.value = filterUser.value === value ? '' : value
  else if (category === 'org') filterOrg.value = filterOrg.value === value ? '' : value
  else if (category === 'status') filterStatus.value = filterStatus.value === value ? 'all' : value
}

// --- API ---
async function fetchHistory() {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams()
    if (filterUser.value) params.set('user', filterUser.value)
    if (filterOrg.value) params.set('org', filterOrg.value)
    if (filterStatus.value !== 'all') params.set('status', filterStatus.value)

    const { from, to } = getDateRange()
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const qs = params.toString()
    const data = await get(`/history${qs ? `?${qs}` : ''}`)
    records.value = data.records || []
  } catch (err) {
    error.value = err.message || 'Failed to load history'
  } finally {
    loading.value = false
  }
}

function openRollback(record) {
  rollbackTarget.value = record
  showRollbackModal.value = true
}

async function confirmRollback() {
  if (!rollbackTarget.value) return
  rollingBack.value = true
  try {
    await post(`/deploy/${rollbackTarget.value.id}/rollback`)
    showRollbackModal.value = false
    rollbackTarget.value = null
    await fetchHistory()
  } catch (err) {
    error.value = err.message || 'Rollback failed'
  } finally {
    rollingBack.value = false
  }
}

function cancelRollback() {
  showRollbackModal.value = false
  rollbackTarget.value = null
}

// --- Lifecycle ---
onMounted(fetchHistory)
watch([filterUser, filterOrg, filterStatus, filterRange], fetchHistory)
</script>

<template>
  <div class="h-[calc(100vh-3.5rem)] flex flex-col">
    <!-- Header Bar -->
    <div class="border-b border-[var(--glass-border)] p-6" style="background: var(--glass-bg);">
      <div class="max-w-7xl mx-auto space-y-4">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-[var(--text-primary)]" style="text-wrap: balance">Logs</h1>
          <p class="text-sm text-[var(--text-secondary)]">
            {{ filteredRecords.length }} of {{ records.length }} logs
          </p>
        </div>

        <div class="flex gap-2">
          <!-- Search -->
          <div class="relative flex-1">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              v-model="searchQuery"
              placeholder="Search logs by user, org, or operation..."
              class="h-9 w-full pl-9 pr-3 text-sm rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-primary-border)] focus:shadow-[0_0_8px_var(--color-primary-glow)]"
              style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur)"
            />
          </div>

          <!-- Filter Toggle -->
          <GlassButton
            :variant="showFilters ? 'primary' : 'secondary'"
            size="sm"
            class="relative h-9 px-3"
            @click="showFilters = !showFilters"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            <!-- Active filter count badge -->
            <span
              v-if="activeFilterCount > 0"
              class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-error)] text-[9px] font-bold text-white"
            >
              {{ activeFilterCount }}
            </span>
          </GlassButton>

          <!-- Refresh -->
          <GlassButton
            variant="ghost"
            size="sm"
            class="h-9"
            :disabled="loading"
            @click="fetchHistory"
          >
            <svg class="w-4 h-4" :class="loading && 'animate-spin'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </GlassButton>
        </div>
      </div>
    </div>

    <!-- Main Content: Filter Sidebar + Log Rows -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Filter Sidebar (slides in/out) -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="w-0 opacity-0"
        enter-to-class="w-[280px] opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="w-[280px] opacity-100"
        leave-to-class="w-0 opacity-0"
      >
        <div
          v-if="showFilters"
          class="w-[280px] flex-shrink-0 overflow-hidden border-r border-[var(--glass-border)]"
          style="background: var(--glass-bg);"
        >
          <div class="h-full overflow-y-auto p-4 space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-[var(--text-primary)]">Filters</h3>
              <GlassButton v-if="activeFilterCount > 0" variant="ghost" size="sm" @click="clearFilters">
                Clear
              </GlassButton>
            </div>

            <!-- Status -->
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</p>
              <div class="space-y-2">
                <button
                  v-for="status in ['success', 'failed']"
                  :key="status"
                  class="flex w-full items-center justify-between gap-2 border rounded-[var(--radius-md)] px-3 py-2 text-sm transition-all duration-150"
                  :class="
                    filterStatus === status
                      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                      : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--color-primary-border)]/40 hover:bg-[var(--glass-bg-hover)]'
                  "
                  @click="toggleFilterValue('status', status)"
                >
                  <span class="capitalize">{{ status }}</span>
                  <svg v-if="filterStatus === status" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- User -->
            <div v-if="uniqueUsers.length > 0" class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">User</p>
              <div class="space-y-2">
                <button
                  v-for="user in uniqueUsers"
                  :key="user"
                  class="flex w-full items-center justify-between gap-2 border rounded-[var(--radius-md)] px-3 py-2 text-sm transition-all duration-150"
                  :class="
                    filterUser === user
                      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                      : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--color-primary-border)]/40 hover:bg-[var(--glass-bg-hover)]'
                  "
                  @click="toggleFilterValue('user', user)"
                >
                  <span>{{ user }}</span>
                  <svg v-if="filterUser === user" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Org -->
            <div v-if="uniqueOrgs.length > 0" class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Org</p>
              <div class="space-y-2">
                <button
                  v-for="org in uniqueOrgs"
                  :key="org"
                  class="flex w-full items-center justify-between gap-2 border rounded-[var(--radius-md)] px-3 py-2 text-sm transition-all duration-150"
                  :class="
                    filterOrg === org
                      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                      : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--color-primary-border)]/40 hover:bg-[var(--glass-bg-hover)]'
                  "
                  @click="toggleFilterValue('org', org)"
                >
                  <span>{{ org }}</span>
                  <svg v-if="filterOrg === org" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Date Range -->
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Date Range</p>
              <div class="space-y-2">
                <button
                  v-for="range in ['7d', '30d', '90d']"
                  :key="range"
                  class="flex w-full items-center justify-between gap-2 border rounded-[var(--radius-md)] px-3 py-2 text-sm transition-all duration-150"
                  :class="
                    filterRange === range
                      ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                      : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:border-[var(--color-primary-border)]/40 hover:bg-[var(--glass-bg-hover)]'
                  "
                  @click="filterRange = filterRange === range ? '30d' : range"
                >
                  <span>Last {{ range }}</span>
                  <svg v-if="filterRange === range" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Log Rows -->
      <div class="flex-1">
        <!-- Loading -->
        <div v-if="loading && records.length === 0" class="flex items-center justify-center py-20">
          <div class="inline-block w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="filteredRecords.length === 0" class="p-12 text-center">
          <p class="text-[var(--text-muted)]">No logs match your filters.</p>
        </div>

        <!-- Rows -->
        <div v-else class="divide-y divide-[var(--glass-border)]">
          <TransitionGroup
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div v-for="record in paginatedRecords" :key="record.id">
              <!-- Row Button -->
              <button
                class="w-full p-4 text-left transition-colors duration-150 hover:bg-[var(--glass-bg-hover)]"
                @click="toggleRow(record.id)"
              >
                <div class="flex items-center gap-4">
                  <!-- Chevron -->
                  <svg
                    class="h-4 w-4 flex-shrink-0 text-[var(--text-muted)] transition-transform duration-200"
                    :class="expandedRowId === record.id && 'rotate-180'"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>

                  <!-- Level/Status Badge -->
                  <GlassBadge
                    :variant="record.status === 'success' ? 'success' : record.status === 'failed' ? 'error' : 'warning'"
                    size="md"
                    class="flex-shrink-0 capitalize"
                  >
                    {{ record.status || 'pending' }}
                  </GlassBadge>

                  <!-- Time -->
                  <time class="w-20 flex-shrink-0 font-mono text-xs text-[var(--text-muted)]">
                    {{ relativeTime(record.startedAt) }}
                  </time>

                  <!-- Operation Type -->
                  <GlassBadge :variant="operationBadgeVariant(record)" size="sm" class="flex-shrink-0">
                    {{ operationLabel(record) }}
                  </GlassBadge>

                  <!-- User / Service -->
                  <span class="flex-shrink-0 min-w-max text-sm font-medium text-[var(--text-primary)]">
                    {{ record.user || 'Unknown' }}
                  </span>

                  <!-- Message / Flow -->
                  <p class="flex-1 truncate text-sm text-[var(--text-secondary)]">
                    {{ orgFlow(record).source }} → {{ orgFlow(record).target }}
                  </p>

                  <!-- Components count -->
                  <span class="flex-shrink-0 font-mono text-sm font-semibold text-[var(--text-secondary)]">
                    {{ (record.components || []).length }} items
                  </span>

                  <!-- Duration -->
                  <span class="w-16 flex-shrink-0 text-right font-mono text-xs text-[var(--text-muted)]">
                    {{ formatDuration(record.startedAt, record.completedAt) }}
                  </span>
                </div>
              </button>

              <!-- Expanded Details -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 max-h-0"
                enter-to-class="opacity-100 max-h-[600px]"
                leave-active-class="transition-all duration-150 ease-in"
                leave-from-class="opacity-100 max-h-[600px]"
                leave-to-class="opacity-0 max-h-0"
              >
                <div
                  v-if="expandedRowId === record.id"
                  class="overflow-hidden border-t border-[var(--glass-border)]"
                  style="background: var(--glass-bg);"
                >
                  <div class="space-y-4 p-4">
                    <!-- Message / Error -->
                    <div v-if="record.error">
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Error</p>
                      <pre class="rounded-[var(--radius-md)] bg-[var(--color-error-bg)] border border-[var(--color-error-border)] p-3 font-mono text-sm text-[var(--color-error)] whitespace-pre-wrap overflow-x-auto">{{ record.error }}</pre>
                    </div>

                    <!-- Details Grid -->
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Duration</p>
                        <p class="font-mono text-[var(--text-primary)]">{{ formatDuration(record.startedAt, record.completedAt) }}</p>
                      </div>
                      <div>
                        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Timestamp</p>
                        <p class="font-mono text-xs text-[var(--text-primary)]">{{ absoluteDate(record.startedAt) }}</p>
                      </div>
                      <div>
                        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Operation ID</p>
                        <p class="font-mono text-xs text-[var(--text-secondary)]">{{ record.id }}</p>
                      </div>
                      <div>
                        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Flow</p>
                        <p class="font-mono text-xs text-[var(--text-secondary)]">{{ orgFlow(record).source }} → {{ orgFlow(record).target }}</p>
                      </div>
                    </div>

                    <!-- Components Tags -->
                    <div v-if="record.components && record.components.length > 0">
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Components</p>
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="(comp, i) in record.components"
                          :key="i"
                          class="inline-block px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] font-mono"
                          style="background: var(--glass-bg);"
                        >
                          {{ typeof comp === 'string' ? comp : comp.fullName || comp.type + ':' + comp.name }}
                        </span>
                      </div>
                    </div>

                    <!-- Failed Components -->
                    <div v-if="record.failedComponents && record.failedComponents.length > 0">
                      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-error)]">Failed Components</p>
                      <div class="space-y-1">
                        <div
                          v-for="(fc, i) in record.failedComponents"
                          :key="i"
                          class="text-xs text-[var(--text-secondary)] bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-[var(--radius-sm)] px-2 py-1"
                        >
                          <span class="font-mono">{{ fc.fullName || fc.componentType }}</span>
                          <span v-if="fc.problem" class="text-[var(--color-error)] ml-2">{{ fc.problem }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div v-if="record.type === 'deploy' && record.status === 'success'" class="pt-2" @click.stop>
                      <GlassButton variant="danger" size="sm" @click="openRollback(record)">
                        Rollback
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>
          </TransitionGroup>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="border-t border-[var(--glass-border)] p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs text-[var(--text-muted)]">
              {{ (currentPage - 1) * ITEMS_PER_PAGE + 1 }}–{{ Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length) }} of {{ filteredRecords.length }} records
            </span>
            <GlassPagination
              v-model:current-page="currentPage"
              :total-pages="totalPages"
              :items-to-display="5"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Rollback Confirm Modal -->
    <ConfirmModal
      v-if="showRollbackModal"
      title="Confirm Rollback"
      :message="`This will revert the components deployed to ${rollbackTarget?.targetOrg || 'the target org'} back to their previous state.`"
      confirm-text="Rollback"
      :dangerous="true"
      @confirm="confirmRollback"
      @cancel="cancelRollback"
    />
  </div>
</template>
