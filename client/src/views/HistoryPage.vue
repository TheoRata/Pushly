<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '../composables/useApi.js'
import ConfirmModal from '../components/ConfirmModal.vue'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'
import GlassToggle from '../components/glass/GlassToggle.vue'

const { get, post } = useApi()

// --- State ---
const records = ref([])
const loading = ref(false)
const error = ref(null)

// Filters
const filterUser = ref('')
const filterOrg = ref('')
const filterStatus = ref('all')
const filterRange = ref('30d')
const customFrom = ref('')
const customTo = ref('')

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
    // Refresh history
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

// Refetch when filters change (except custom date inputs which use a button)
watch([filterUser, filterOrg, filterStatus, filterRange], fetchHistory)
</script>

<template>
  <div class="max-w-6xl mx-auto px-6 py-8">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Deployment History</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">Shared team deployment log. View past retrieve and deploy operations.</p>
    </div>

    <!-- Filter Bar -->
    <GlassCard padding="md" class="mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <!-- By Person -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Person</label>
          <select
            v-model="filterUser"
            class="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
          >
            <option value="">All users</option>
            <option v-for="u in uniqueUsers" :key="u" :value="u">{{ u }}</option>
          </select>
        </div>

        <!-- By Org -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Org</label>
          <select
            v-model="filterOrg"
            class="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
          >
            <option value="">All orgs</option>
            <option v-for="o in uniqueOrgs" :key="o" :value="o">{{ o }}</option>
          </select>
        </div>

        <!-- By Status -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</label>
          <GlassToggle
            :options="[{ label: 'All', value: 'all' }, { label: 'Passed', value: 'success' }, { label: 'Failed', value: 'failed' }]"
            v-model="filterStatus"
          />
        </div>

        <!-- By Date Range -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Date Range</label>
          <GlassToggle
            :options="[{ label: '7d', value: '7d' }, { label: '30d', value: '30d' }, { label: '90d', value: '90d' }, { label: 'Custom', value: 'custom' }]"
            v-model="filterRange"
          />
        </div>

        <!-- Custom Date Inputs -->
        <template v-if="filterRange === 'custom'">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">From</label>
            <input
              v-model="customFrom"
              type="date"
              class="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">To</label>
            <input
              v-model="customTo"
              type="date"
              class="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>
          <GlassButton variant="primary" size="sm" class="self-end" @click="fetchHistory">
            Apply
          </GlassButton>
        </template>

        <!-- Refresh -->
        <GlassButton
          variant="ghost"
          size="sm"
          class="ml-auto self-end"
          :disabled="loading"
          @click="fetchHistory"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span v-if="loading">Loading...</span>
          <span v-else>Refresh</span>
        </GlassButton>
      </div>
    </GlassCard>

    <!-- Error -->
    <div v-if="error" class="mb-4 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-sm text-[var(--color-error)]">
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="loading && records.length === 0" class="text-center py-16">
      <div class="inline-block w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      <p class="mt-3 text-sm text-[var(--text-secondary)]">Loading history...</p>
    </div>

    <!-- Empty State -->
    <GlassCard v-else-if="!loading && records.length === 0" padding="lg" class="text-center">
      <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--glass-bg)] flex items-center justify-center">
        <svg class="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </div>
      <p class="text-[var(--text-secondary)]">No deployments yet.</p>
      <p class="mt-1 text-sm text-[var(--text-muted)]">Use the Retrieve or Deploy pages to get started.</p>
    </GlassCard>

    <!-- History Table -->
    <div v-else class="glass rounded-[var(--radius-lg)] overflow-hidden">
      <!-- Table Header -->
      <div class="grid grid-cols-[48px_1fr_100px_100px_1.2fr_140px_80px_140px] gap-2 px-4 py-3 border-b border-[var(--glass-border)] text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide sticky top-0 bg-[var(--bg-primary)] z-10">
        <div>Status</div>
        <div>User</div>
        <div>Operation</div>
        <div>Components</div>
        <div>Source / Target</div>
        <div>Date</div>
        <div>Duration</div>
        <div class="text-right">Actions</div>
      </div>

      <!-- Table Rows -->
      <div v-for="record in records" :key="record.id">
        <!-- Main Row -->
        <div
          class="grid grid-cols-[48px_1fr_100px_100px_1.2fr_140px_80px_140px] gap-2 px-4 py-3 items-center border-b border-[var(--glass-border)] transition-colors cursor-pointer text-sm hover:bg-[var(--glass-bg-hover)]"
          :class="{
            'border-l-2 border-l-[var(--color-primary)]': isProductionOrg(record),
          }"
          @click="toggleRow(record.id)"
        >
          <!-- Status Icon -->
          <div class="flex items-center justify-center">
            <span v-if="record.status === 'success'" class="text-[var(--color-success)]">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </span>
            <span v-else-if="record.status === 'failed'" class="text-[var(--color-error)]">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </span>
            <span v-else class="text-[var(--color-warning)]">
              <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </span>
          </div>

          <!-- User -->
          <div class="text-[var(--text-primary)] truncate">{{ record.user || 'Unknown' }}</div>

          <!-- Operation -->
          <div>
            <GlassBadge :variant="operationBadgeVariant(record)" size="md">
              {{ operationLabel(record) }}
            </GlassBadge>
          </div>

          <!-- Components -->
          <div class="text-[var(--text-secondary)]">
            {{ (record.components || []).length }} item{{ (record.components || []).length !== 1 ? 's' : '' }}
          </div>

          <!-- Source -> Target -->
          <div class="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
            <span class="truncate">{{ orgFlow(record).source }}</span>
            <svg class="w-3.5 h-3.5 flex-shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
            <span class="truncate">{{ orgFlow(record).target }}</span>
          </div>

          <!-- Date -->
          <div class="text-[var(--text-secondary)]" :title="absoluteDate(record.startedAt)">
            {{ relativeTime(record.startedAt) }}
          </div>

          <!-- Duration -->
          <div class="text-[var(--text-muted)]">
            {{ formatDuration(record.startedAt, record.completedAt) }}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2" @click.stop>
            <GlassButton variant="ghost" size="sm" @click="toggleRow(record.id)">
              Details
            </GlassButton>
            <GlassButton
              v-if="record.type === 'deploy' && record.status === 'success'"
              variant="danger"
              size="sm"
              @click="openRollback(record)"
            >
              Rollback
            </GlassButton>
          </div>
        </div>

        <!-- Expanded Row Details -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-96"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-96"
          leave-to-class="opacity-0 max-h-0"
        >
          <div
            v-if="expandedRowId === record.id"
            class="overflow-hidden border-b border-[var(--glass-border)] bg-[var(--glass-bg)]"
          >
            <div class="px-6 py-4 space-y-3">
              <!-- Operation ID -->
              <div class="flex items-center gap-2 text-xs">
                <span class="text-[var(--text-muted)]">ID:</span>
                <span class="font-mono text-[var(--text-secondary)]">{{ record.id }}</span>
              </div>

              <!-- Timestamps -->
              <div class="flex items-center gap-6 text-xs">
                <div>
                  <span class="text-[var(--text-muted)]">Started: </span>
                  <span class="text-[var(--text-secondary)]">{{ absoluteDate(record.startedAt) }}</span>
                </div>
                <div v-if="record.completedAt">
                  <span class="text-[var(--text-muted)]">Completed: </span>
                  <span class="text-[var(--text-secondary)]">{{ absoluteDate(record.completedAt) }}</span>
                </div>
              </div>

              <!-- Components List -->
              <div v-if="record.components && record.components.length > 0">
                <p class="text-xs font-medium text-[var(--text-muted)] mb-1.5">Components ({{ record.components.length }}):</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(comp, i) in record.components"
                    :key="i"
                    class="inline-block px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] font-mono"
                  >
                    {{ typeof comp === 'string' ? comp : comp.fullName || comp.type + ':' + comp.name }}
                  </span>
                </div>
              </div>

              <!-- Error Details -->
              <div v-if="record.error" class="mt-2">
                <p class="text-xs font-medium text-[var(--color-error)] mb-1">Error:</p>
                <pre class="text-xs text-[var(--color-error)]/80 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-[var(--radius-md)] p-3 overflow-x-auto whitespace-pre-wrap">{{ record.error }}</pre>
              </div>

              <!-- Failed Components -->
              <div v-if="record.failedComponents && record.failedComponents.length > 0" class="mt-2">
                <p class="text-xs font-medium text-[var(--color-error)] mb-1.5">Failed Components:</p>
                <div class="space-y-1">
                  <div
                    v-for="(fc, i) in record.failedComponents"
                    :key="i"
                    class="text-xs text-[var(--text-secondary)] bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-[var(--radius-sm)] px-2 py-1"
                  >
                    <span class="font-mono">{{ fc.fullName || fc.componentType }}</span>
                    <span v-if="fc.problem" class="text-[var(--color-error)]/70 ml-2">{{ fc.problem }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
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
