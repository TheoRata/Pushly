<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import { useWebSocket } from '../composables/useWebSocket'
import WizardStepper from '../components/WizardStepper.vue'
import OrgDropdown from '../components/OrgDropdown.vue'
import MetadataTree from '../components/MetadataTree.vue'
import ProgressTracker from '../components/ProgressTracker.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const api = useApi()
const { orgs, checkHealth } = useOrgs()
const { on } = useWebSocket()

const deployCompleted = ref(false)
const deployFailed = ref(false)

// Auto-select retrieve if coming from "Deploy These" on retrieve page
onMounted(async () => {
  if (route.query.from === 'retrieve' && route.query.retrieveId) {
    sourceType.value = 'retrieve'
    loadingRetrieves.value = true
    try {
      const data = await api.get('/retrieve')
      const ops = data.operations || data || []
      previousRetrieves.value = ops.filter((r) => r.status === 'success')
      const match = previousRetrieves.value.find((r) => r.id === route.query.retrieveId)
      if (match) {
        selectedRetrieve.value = match
        // Auto-advance to step 2 (components are pre-populated via the watch)
        currentStep.value = 1
      }
    } catch {
      previousRetrieves.value = []
    } finally {
      loadingRetrieves.value = false
    }
  }
})

on('operation:complete', (data) => {
  if (data.operationId === operationId.value) {
    deployCompleted.value = true
    deployFailed.value = data.status === 'failed' || !!data.summary?.error
  }
})

// Wizard state
const currentStep = ref(0)
const steps = [
  { label: 'Source' },
  { label: 'Select Components' },
  { label: 'Target Org' },
  { label: 'Validate' },
  { label: 'Deploy' },
]

// Step 1 — Source
const sourceType = ref('') // 'retrieve' | 'org'
const previousRetrieves = ref([])
const selectedRetrieve = ref(null)
const sourceOrg = ref('')
const loadingRetrieves = ref(false)

async function loadRetrieves() {
  loadingRetrieves.value = true
  try {
    const data = await api.get('/retrieve')
    const ops = data.operations || data || []
    // Only show successful retrieves
    previousRetrieves.value = ops.filter((r) => r.status === 'success')
  } catch {
    previousRetrieves.value = []
  } finally {
    loadingRetrieves.value = false
  }
}

function selectSourceType(type) {
  sourceType.value = type
  if (type === 'retrieve') {
    loadRetrieves()
  }
}

function selectRetrieve(retrieve) {
  selectedRetrieve.value = retrieve
}

const canAdvanceStep1 = computed(() => {
  if (sourceType.value === 'retrieve') return selectedRetrieve.value !== null
  if (sourceType.value === 'org') return sourceOrg.value !== ''
  return false
})

// Step 2 — Select Components
const selectedComponents = ref([])

const canAdvanceStep2 = computed(() => selectedComponents.value.length > 0)

function isRetrieveComponentSelected(comp) {
  const name = comp.fullName || comp.name
  return selectedComponents.value.some((s) => s.fullName === name && s.type === comp.type)
}

function toggleRetrieveComponent(comp) {
  const name = comp.fullName || comp.name
  const idx = selectedComponents.value.findIndex((s) => s.fullName === name && s.type === comp.type)
  if (idx >= 0) {
    selectedComponents.value.splice(idx, 1)
  } else {
    selectedComponents.value.push({ fullName: name, type: comp.type })
  }
}

// When choosing from a previous retrieve, pre-populate components
watch(selectedRetrieve, (r) => {
  if (r && r.components) {
    selectedComponents.value = r.components.map((c) => ({
      fullName: c.fullName || c.name,
      type: c.type,
    }))
  }
})

// Step 3 — Target Org
const targetOrg = ref('')
const healthStatus = ref(null) // null | 'checking' | 'healthy' | 'expired'
const healthError = ref('')

const targetOrgData = computed(() => orgs.value.find((o) => o.alias === targetOrg.value))
const isProduction = computed(() => targetOrgData.value?.type === 'production')

watch(targetOrg, async (alias) => {
  if (!alias) {
    healthStatus.value = null
    return
  }
  healthStatus.value = 'checking'
  healthError.value = ''
  try {
    const result = await checkHealth(alias)
    healthStatus.value = result.status === 'connected' ? 'healthy' : 'expired'
  } catch (err) {
    healthStatus.value = 'expired'
    healthError.value = err.message || 'Connection check failed'
  }
})

const canAdvanceStep3 = computed(() => targetOrg.value && healthStatus.value === 'healthy')

// Step 4 — Validate
const validating = ref(false)
const validationResults = ref([])
const validationError = ref('')
const validationPassed = computed(() =>
  validationResults.value.length > 0 &&
  validationResults.value.every((r) => r.status === 'success' || r.status === 'succeeded')
)
const validationFailed = computed(() =>
  validationResults.value.length > 0 &&
  validationResults.value.some((r) => r.status === 'error' || r.status === 'failed')
)

const validationAction = ref('')
const validationFailures = ref([])

// Track the workspace path for "from org" deploys
const activeWorkspacePath = ref('')

async function runValidation() {
  validating.value = true
  validationResults.value = []
  validationError.value = ''
  validationAction.value = ''
  validationFailures.value = []
  try {
    let workspacePath = ''

    if (sourceType.value === 'retrieve' && selectedRetrieve.value) {
      workspacePath = selectedRetrieve.value.workspacePath || selectedRetrieve.value.path
    } else if (sourceType.value === 'org') {
      // For "from org" deploys, first retrieve the components into a workspace
      const retrieveResult = await api.post('/retrieve', {
        orgAlias: sourceOrg.value,
        components: selectedComponents.value,
        mode: 'cherry-pick',
        name: `Deploy prep from ${sourceOrg.value}`,
      })
      // Poll until the retrieve completes
      let attempts = 0
      while (attempts < 60) {
        await new Promise((r) => setTimeout(r, 2000))
        const status = await api.get(`/retrieve/${retrieveResult.operationId}/status`)
        if (status.status === 'completed' || status.status === 'success') break
        if (status.status === 'failed') throw new Error(status.record?.error || 'Retrieve failed')
        attempts++
      }
      // Get the workspace path from history
      const history = await api.get('/retrieve')
      const ops = history.operations || []
      const match = ops.find((r) => r.id === retrieveResult.operationId)
      workspacePath = match?.workspacePath || ''
    }

    if (!workspacePath) {
      throw new Error('No workspace available. Please retrieve components first.')
    }

    activeWorkspacePath.value = workspacePath

    const payload = {
      targetOrg: targetOrg.value,
      workspacePath,
      components: selectedComponents.value,
    }
    const data = await api.post('/deploy/validate', payload)
    // Parse SF CLI result into component-level validation results
    const result = data.result || {}
    const details = result.details || {}
    const successes = Array.isArray(details.componentSuccesses) ? details.componentSuccesses : []
    const failures = Array.isArray(details.componentFailures) ? details.componentFailures : []
    validationResults.value = [
      ...successes.filter((c) => c.fullName !== 'package.xml').map((c) => ({
        name: c.fullName,
        type: c.componentType || '',
        status: 'success',
      })),
      ...failures.map((c) => ({
        name: c.fullName,
        type: c.componentType || '',
        status: 'failed',
        problem: c.problem || '',
        line: c.lineNumber || null,
      })),
    ]
    // If no component details but status is success, create a summary entry
    if (validationResults.value.length === 0 && data.status === 'success') {
      validationResults.value = [{ name: 'All components', type: '', status: 'success' }]
    }
  } catch (err) {
    validationError.value = err.message || 'Validation failed'
    // Extract structured error details from the API response
    if (err.detail) {
      validationAction.value = err.detail.action || ''
      validationFailures.value = err.detail.failures || []
    }
  } finally {
    validating.value = false
  }
}

// Auto-validate when entering step 4
watch(currentStep, (step) => {
  if (step === 3) {
    runValidation()
  }
})

// Step 5 — Deploy
const showConfirmModal = ref(false)
const lockWarning = ref('')
const lockChecking = ref(false)
const deploying = ref(false)
const operationId = ref(null)
const deployStatus = ref('') // '' | 'running' | 'success' | 'partial' | 'error'
const deployError = ref('')

async function initiateDeployment() {
  // Check for deployment lock first
  lockChecking.value = true
  lockWarning.value = ''
  try {
    const lockData = await api.get(`/deploy/lock?org=${encodeURIComponent(targetOrg.value)}`)
    if (lockData && lockData.locked) {
      const ago = lockData.startedAt ? ` (started ${timeAgo(lockData.startedAt)} ago)` : ''
      lockWarning.value = `${lockData.user || 'Someone'} is currently deploying to this org${ago}. Wait or proceed anyway?`
    }
  } catch {
    // No lock endpoint or error — proceed
  } finally {
    lockChecking.value = false
  }
  showConfirmModal.value = true
}

async function confirmDeploy() {
  showConfirmModal.value = false
  deploying.value = true
  deployStatus.value = 'running'
  deployError.value = ''

  try {
    const payload = {
      targetOrg: targetOrg.value,
      components: selectedComponents.value,
    }
    if (sourceType.value === 'retrieve' && selectedRetrieve.value) {
      payload.workspacePath = selectedRetrieve.value.workspacePath || selectedRetrieve.value.path
    } else if (activeWorkspacePath.value) {
      payload.workspacePath = activeWorkspacePath.value
    }
    const data = await api.post('/deploy', payload)
    operationId.value = data.operationId
  } catch (err) {
    deploying.value = false
    deployStatus.value = 'error'
    deployError.value = err.message || 'Deploy request failed'
  }
}

async function retryFailed() {
  if (!operationId.value) return
  deploying.value = true
  deployStatus.value = 'running'
  deployError.value = ''
  try {
    const data = await api.post(`/deploy/${operationId.value}/retry-failed`)
    operationId.value = data.operationId || operationId.value
  } catch (err) {
    deployError.value = err.message || 'Retry failed'
    deployStatus.value = 'error'
  }
}

const rollbackStatus = ref('') // '' | 'running' | 'success' | 'error'
const rollbackError = ref('')
const rollbackOperationId = ref(null)

async function rollbackDeploy() {
  if (!operationId.value) return
  rollbackStatus.value = 'running'
  rollbackError.value = ''
  rollbackOperationId.value = null
  try {
    const data = await api.post(`/deploy/${operationId.value}/rollback`)
    rollbackOperationId.value = data.operationId || null
    rollbackStatus.value = 'success'
  } catch (err) {
    rollbackError.value = err.message || 'Rollback failed'
    rollbackStatus.value = 'error'
  }
}

function resetWizard() {
  currentStep.value = 0
  sourceType.value = ''
  selectedRetrieve.value = null
  sourceOrg.value = ''
  selectedComponents.value = []
  targetOrg.value = ''
  healthStatus.value = null
  validationResults.value = []
  validationError.value = ''
  showConfirmModal.value = false
  lockWarning.value = ''
  deploying.value = false
  operationId.value = null
  deployStatus.value = ''
  deployError.value = ''
  deployCompleted.value = false
  deployFailed.value = false
  rollbackStatus.value = ''
  rollbackError.value = ''
  rollbackOperationId.value = null
  activeWorkspacePath.value = ''
}

function goToHistory() {
  router.push('/history')
}

// Navigation
function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// Helpers
function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Deploy to Org</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">
        Push components to a target Salesforce org
      </p>
    </div>

    <!-- Wizard Stepper -->
    <div class="mb-8">
      <WizardStepper :steps="steps" :current-step="currentStep" />
    </div>

    <!-- Step 1: Source -->
    <div v-if="currentStep === 0" class="space-y-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Choose Source</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- From previous retrieve -->
        <button
          class="flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer text-left"
          :class="sourceType === 'retrieve'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'border-white/10 bg-[var(--bg-surface)] hover:border-white/20'"
          @click="selectSourceType('retrieve')"
        >
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary)]/20">
            <svg class="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div>
            <span class="text-sm font-semibold text-[var(--text-primary)]">From a previous retrieve</span>
            <p class="text-xs text-[var(--text-muted)] mt-1">Select components from a completed retrieve operation</p>
          </div>
        </button>

        <!-- From an org -->
        <button
          class="flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all cursor-pointer text-left"
          :class="sourceType === 'org'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
            : 'border-white/10 bg-[var(--bg-surface)] hover:border-white/20'"
          @click="selectSourceType('org')"
        >
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-secondary)]/20">
            <svg class="w-5 h-5 text-[var(--color-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <div>
            <span class="text-sm font-semibold text-[var(--text-primary)]">From an org</span>
            <p class="text-xs text-[var(--text-muted)] mt-1">Browse and select components directly from a Salesforce org</p>
          </div>
        </button>
      </div>

      <!-- Previous retrieves list -->
      <div v-if="sourceType === 'retrieve'" class="mt-4">
        <div v-if="loadingRetrieves" class="flex items-center gap-2 py-6 justify-center">
          <svg class="animate-spin w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-sm text-[var(--text-muted)]">Loading retrieves...</span>
        </div>

        <div v-else-if="previousRetrieves.length === 0" class="text-center py-6">
          <p class="text-sm text-[var(--text-muted)]">No previous retrieves found. Try retrieving from an org first.</p>
        </div>

        <div v-else class="space-y-2 max-h-80 overflow-y-auto">
          <button
            v-for="ret in previousRetrieves"
            :key="ret.id || ret.workspacePath"
            class="w-full flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer text-left"
            :class="selectedRetrieve === ret
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
              : 'border-white/10 bg-[var(--bg-surface)] hover:border-white/20'"
            @click="selectRetrieve(ret)"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium text-[var(--text-primary)] truncate">
                {{ ret.name || ret.sourceOrg || 'Unnamed retrieve' }}
              </div>
              <div class="text-xs text-[var(--text-muted)] mt-0.5">
                <span v-if="ret.name" class="text-[var(--text-secondary)]">{{ ret.sourceOrg }}</span>
                <span v-if="ret.name"> &middot; </span>
                {{ (ret.components || []).length }} components
                <span v-if="ret.startedAt || ret.createdAt"> &middot; {{ formatDate(ret.startedAt || ret.createdAt) }}</span>
              </div>
            </div>
            <div v-if="selectedRetrieve === ret" class="shrink-0 ml-3">
              <svg class="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- Source org selection -->
      <div v-if="sourceType === 'org'" class="mt-4 max-w-sm">
        <OrgDropdown v-model="sourceOrg" label="Source Org" />
      </div>

      <!-- Next button -->
      <div class="flex justify-end pt-4">
        <button
          class="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!canAdvanceStep1"
          @click="nextStep"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Step 2: Select Components -->
    <div v-if="currentStep === 1" class="space-y-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Select Components</h2>

      <!-- From previous retrieve: checkbox list -->
      <div v-if="sourceType === 'retrieve' && selectedRetrieve" class="rounded-xl border border-white/10 bg-[var(--bg-surface)] overflow-hidden">
        <div class="p-3 border-b border-white/5 flex items-center justify-between">
          <span class="text-sm text-[var(--text-secondary)]">
            {{ selectedComponents.length }} of {{ (selectedRetrieve.components || []).length }} selected
          </span>
          <div class="flex gap-2">
            <button
              class="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 cursor-pointer"
              @click="selectedComponents = (selectedRetrieve.components || []).map(c => ({ fullName: c.fullName || c.name, type: c.type }))"
            >
              Select All
            </button>
            <button
              class="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
              @click="selectedComponents = []"
            >
              Clear
            </button>
          </div>
        </div>
        <div class="max-h-96 overflow-y-auto divide-y divide-white/5">
          <div
            v-for="comp in (selectedRetrieve.components || [])"
            :key="`${comp.type}:${comp.fullName || comp.name}`"
            class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] cursor-pointer transition-colors"
            @click="toggleRetrieveComponent(comp)"
          >
            <span
              class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
              :class="isRetrieveComponentSelected(comp)
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                : 'border-white/20'"
            >
              <svg
                v-if="isRetrieveComponentSelected(comp)"
                class="w-3 h-3 text-white"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </span>
            <span class="text-sm text-[var(--text-primary)] truncate flex-1">{{ comp.fullName || comp.name }}</span>
            <span class="text-xs text-[var(--text-muted)] font-mono shrink-0">{{ comp.type }}</span>
          </div>
        </div>
      </div>

      <!-- From org: MetadataTree -->
      <div v-if="sourceType === 'org' && sourceOrg" class="rounded-xl border border-white/10 overflow-hidden" style="height: 500px;">
        <MetadataTree
          :org-alias="sourceOrg"
          v-model="selectedComponents"
        />
      </div>

      <!-- Navigation -->
      <div class="flex justify-between pt-4">
        <button
          class="px-5 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
          @click="prevStep"
        >
          Back
        </button>
        <button
          class="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!canAdvanceStep2"
          @click="nextStep"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Step 3: Target Org -->
    <div v-if="currentStep === 2" class="space-y-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Target Org</h2>
      <p class="text-sm text-[var(--text-secondary)]">Select the Salesforce org to deploy to.</p>

      <div class="max-w-sm">
        <OrgDropdown v-model="targetOrg" label="Target Org" />
      </div>

      <!-- Production warning -->
      <div
        v-if="isProduction"
        class="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20"
      >
        <svg class="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p class="text-sm font-semibold text-[var(--color-error)]">Production Org</p>
          <p class="text-xs text-[var(--color-error)]/80 mt-0.5">
            You are deploying to a production environment. Extra confirmation will be required.
          </p>
        </div>
      </div>

      <!-- Health check status -->
      <div v-if="targetOrg">
        <div v-if="healthStatus === 'checking'" class="flex items-center gap-2 py-2">
          <svg class="animate-spin w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span class="text-sm text-[var(--text-muted)]">Checking connection...</span>
        </div>
        <div v-else-if="healthStatus === 'healthy'" class="flex items-center gap-2 py-2">
          <svg class="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span class="text-sm text-[var(--color-success)]">Connection healthy</span>
        </div>
        <div v-else-if="healthStatus === 'expired'" class="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
          <svg class="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-[var(--color-warning)]">Connection Expired</p>
            <p class="text-xs text-[var(--text-muted)] mt-0.5">
              {{ healthError || 'The auth token for this org has expired.' }}
              Please reconnect on the <router-link to="/" class="text-[var(--color-primary)] underline">Orgs page</router-link>.
            </p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between pt-4">
        <button
          class="px-5 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
          @click="prevStep"
        >
          Back
        </button>
        <button
          class="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          :disabled="!canAdvanceStep3"
          @click="nextStep"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Step 4: Validate -->
    <div v-if="currentStep === 3" class="space-y-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Validate Deployment</h2>
      <p class="text-sm text-[var(--text-secondary)]">
        Running a dry-run validation against <span class="font-medium text-[var(--text-primary)]">{{ targetOrg }}</span>
      </p>

      <!-- Validating spinner -->
      <div v-if="validating" class="flex flex-col items-center gap-3 py-12">
        <svg class="animate-spin w-8 h-8 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm text-[var(--text-muted)]">Validating deployment...</span>
      </div>

      <!-- Validation error -->
      <div v-else-if="validationError" class="space-y-4">
        <div class="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <p class="text-sm text-[var(--color-error)] font-medium">Validation Failed</p>
          <p class="text-sm text-[var(--text-secondary)] mt-2">{{ validationError }}</p>
          <p v-if="validationAction" class="text-xs text-[var(--text-muted)] mt-2">
            <span class="font-medium text-[var(--color-warning)]">Suggested fix:</span> {{ validationAction }}
          </p>
        </div>

        <!-- Component-level failures -->
        <div v-if="validationFailures.length > 0" class="rounded-lg bg-[var(--bg-primary)] border border-white/5 overflow-hidden">
          <div class="px-4 py-2.5 border-b border-white/5">
            <p class="text-xs font-medium text-[var(--text-muted)]">{{ validationFailures.length }} component{{ validationFailures.length !== 1 ? 's' : '' }} failed</p>
          </div>
          <div class="max-h-64 overflow-y-auto divide-y divide-white/5">
            <div v-for="(f, i) in validationFailures" :key="i" class="px-4 py-3">
              <div class="flex items-center gap-2 mb-1">
                <svg class="w-3.5 h-3.5 text-[var(--color-error)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="text-xs font-mono text-[var(--text-muted)]">{{ f.type }}</span>
                <span class="text-sm font-medium text-[var(--text-primary)]">{{ f.name }}</span>
                <span v-if="f.line" class="text-xs text-[var(--text-muted)]">line {{ f.line }}</span>
              </div>
              <p class="text-xs text-[var(--color-error)]/80 pl-5.5">{{ f.problem }}</p>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
            @click="prevStep"
          >
            Back
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
            @click="runValidation"
          >
            Re-validate
          </button>
        </div>
      </div>

      <!-- Validation results -->
      <div v-else-if="validationResults.length > 0" class="space-y-4">
        <!-- Success banner -->
        <div
          v-if="validationPassed"
          class="p-4 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20"
        >
          <p class="text-sm text-[var(--color-success)] font-semibold">
            Validation passed. Safe to deploy.
          </p>
        </div>

        <!-- Failure banner -->
        <div
          v-if="validationFailed"
          class="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20"
        >
          <p class="text-sm text-[var(--color-error)] font-semibold">
            Validation failed for some components.
          </p>
          <p class="text-xs text-[var(--color-error)]/80 mt-1">Review the results below and adjust your selection.</p>
        </div>

        <!-- Per-component results -->
        <div class="rounded-xl border border-white/10 bg-[var(--bg-surface)] overflow-hidden">
          <div class="max-h-80 overflow-y-auto divide-y divide-white/5">
            <div
              v-for="result in validationResults"
              :key="`${result.component || result.name}`"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <!-- Status icon -->
              <svg
                v-if="result.status === 'success' || result.status === 'succeeded'"
                class="w-4 h-4 text-[var(--color-success)] shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <svg
                v-else
                class="w-4 h-4 text-[var(--color-error)] shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span v-if="result.type" class="text-xs font-mono text-[var(--text-muted)]">{{ result.type }}</span>
                  <span class="text-sm text-[var(--text-primary)] truncate">
                    {{ result.component || result.name }}
                  </span>
                </div>
                <span
                  v-if="(result.message || result.problem) && (result.status === 'error' || result.status === 'failed')"
                  class="text-xs text-[var(--color-error)]/80 block mt-0.5"
                >
                  {{ result.message || result.problem }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="flex justify-between pt-2">
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
            @click="prevStep"
          >
            Back
          </button>
          <div class="flex gap-3">
            <button
              v-if="validationFailed"
              class="px-4 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
              @click="runValidation"
            >
              Re-validate
            </button>
            <button
              v-if="validationPassed"
              class="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
              @click="nextStep"
            >
              Deploy Now
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: Deploy -->
    <div v-if="currentStep === 4" class="space-y-4">
      <h2 class="text-lg font-semibold text-[var(--text-primary)]">Deploy</h2>

      <!-- Pre-deploy: show summary and deploy button -->
      <div v-if="!deploying && !operationId && !deployError">
        <div class="rounded-xl border border-white/10 bg-[var(--bg-surface)] p-5 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--text-secondary)]">Target</span>
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-[var(--text-primary)]">{{ targetOrg }}</span>
              <span
                v-if="isProduction"
                class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-error)]/15 text-[var(--color-error)]"
              >
                PROD
              </span>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--text-secondary)]">Components</span>
            <span class="text-sm font-medium text-[var(--text-primary)]">{{ selectedComponents.length }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-[var(--text-secondary)]">Validation</span>
            <span class="text-sm font-medium text-[var(--color-success)]">Passed</span>
          </div>
        </div>

        <div class="flex justify-between pt-6">
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
            @click="prevStep"
          >
            Back
          </button>
          <button
            class="px-6 py-2.5 text-sm font-semibold rounded-lg text-white transition-colors cursor-pointer"
            :class="isProduction
              ? 'bg-[var(--color-error)] hover:bg-[var(--color-error)]/80'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80'"
            :disabled="lockChecking"
            @click="initiateDeployment"
          >
            <span v-if="lockChecking">Checking...</span>
            <span v-else>Deploy Now</span>
          </button>
        </div>
      </div>

      <!-- Deploy error without operation -->
      <div v-if="deployError && !operationId" class="space-y-4">
        <div class="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <p class="text-sm text-[var(--color-error)] font-medium">Deploy failed</p>
          <p class="text-xs text-[var(--color-error)]/80 mt-1">{{ deployError }}</p>
        </div>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
            @click="prevStep"
          >
            Back
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
            @click="initiateDeployment"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Progress tracker -->
      <div v-if="operationId">
        <ProgressTracker :operation-id="rollbackOperationId || operationId" />

        <!-- Rollback status -->
        <div v-if="rollbackStatus === 'running'" class="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <svg class="animate-spin w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Rolling back...
        </div>

        <div v-if="rollbackStatus === 'error'" class="mt-4 p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <p class="text-sm text-[var(--color-error)] font-medium">Rollback not available</p>
          <p class="text-xs text-[var(--text-secondary)] mt-1">{{ rollbackError }}</p>
          <p class="text-xs text-[var(--text-muted)] mt-2">To undo this deploy, retrieve the previous version of the components from the source org and deploy them to the target.</p>
        </div>

        <!-- Post-deploy actions (show only after deploy completes) -->
        <div v-if="deployCompleted && rollbackStatus !== 'running'" class="flex flex-wrap gap-3 mt-6">
          <button
            class="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 transition-colors cursor-pointer"
            @click="resetWizard"
          >
            Deploy More
          </button>
          <button
            class="px-5 py-2.5 text-sm font-medium rounded-lg border border-white/10 text-[var(--text-secondary)] hover:bg-white/5 transition-colors cursor-pointer"
            @click="goToHistory"
          >
            View History
          </button>
          <template v-if="deployFailed && rollbackStatus === ''">
            <button
              class="px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--color-warning)]/30 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10 transition-colors cursor-pointer"
              @click="retryFailed"
            >
              Retry Failed Only
            </button>
            <button
              class="px-4 py-2.5 text-sm font-medium rounded-lg border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors cursor-pointer"
              @click="rollbackDeploy"
            >
              Rollback
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Confirm Modal -->
    <ConfirmModal
      v-if="showConfirmModal"
      :title="`Deploy to ${targetOrg}`"
      :message="`This action will modify ${targetOrg}. This cannot be undone automatically.\n\n${selectedComponents.length} component${selectedComponents.length !== 1 ? 's' : ''} will be deployed.${lockWarning ? '\n\n⚠ ' + lockWarning : ''}`"
      confirm-text="Deploy"
      :dangerous="true"
      :require-typed-confirmation="isProduction"
      :confirmation-text="isProduction ? targetOrg : ''"
      @confirm="confirmDeploy"
      @cancel="showConfirmModal = false"
    />
  </div>
</template>
