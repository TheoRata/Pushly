<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import { useWebSocket } from '../composables/useWebSocket'
import GlassPillStepper from '../components/glass/GlassPillStepper.vue'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'
import GlassToggle from '../components/glass/GlassToggle.vue'
import OrgDropdown from '../components/OrgDropdown.vue'
import MetadataTree from '../components/MetadataTree.vue'
import ProgressTracker from '../components/ProgressTracker.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import GlassSkeleton from '../components/glass/GlassSkeleton.vue'

const router = useRouter()
const route = useRoute()
const api = useApi()
const { orgs, checkHealth } = useOrgs()
const { on } = useWebSocket()

const deployCompleted = ref(false)
const deployFailed = ref(false)

// Key-based steps for GlassPillStepper
const steps = [
  { label: 'Source', key: 'source' },
  { label: 'Components', key: 'components' },
  { label: 'Target', key: 'target' },
  { label: 'Validate', key: 'validate' },
  { label: 'Deploy', key: 'deploy' },
]

const stepKeys = steps.map((s) => s.key)

// Numeric index kept for all existing logic — keys are derived from it
const currentStep = ref(0)
const completedSteps = ref([])

const currentStepKey = computed(() => stepKeys[currentStep.value])

function onStepClick(key) {
  const idx = stepKeys.indexOf(key)
  if (idx !== -1) {
    currentStep.value = idx
  }
}

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
        // Mark source step complete and auto-advance to components step
        if (!completedSteps.value.includes('source')) {
          completedSteps.value = [...completedSteps.value, 'source']
        }
        currentStep.value = 1
      }
    } catch {
      previousRetrieves.value = []
    } finally {
      loadingRetrieves.value = false
    }
  }

  if (route.query.fromCompare === 'true') {
    const components = (route.query.components || '').split(',').filter(Boolean)
    selectedComponents.value = components.map((c) => {
      const [type, ...nameParts] = c.split(':')
      return { type, fullName: nameParts.join(':') }
    })
    sourceOrg.value = route.query.source || ''
    targetOrg.value = route.query.target || ''
    // Set sourceType to 'org' so validation triggers retrieve-then-validate
    sourceType.value = 'org'

    if (selectedComponents.value.length > 0) {
      completedSteps.value = ['source', 'components', 'target']
      currentStep.value = 3
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
const sourceType = ref('') // 'retrieve' | 'org'
const previousRetrieves = ref([])
const selectedRetrieve = ref(null)
const sourceOrg = ref('')
const loadingRetrieves = ref(false)

// Source type toggle options for GlassToggle
const sourceTypeOptions = [
  { label: 'Previous Retrieve', value: 'retrieve' },
  { label: 'From Org', value: 'org' },
]

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

// Clear target if user changes source to match it
watch(sourceOrg, (src) => {
  if (src && src === targetOrg.value) targetOrg.value = ''
})

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
  completedSteps.value = []
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
    // Mark current step as completed before advancing
    const key = stepKeys[currentStep.value]
    if (!completedSteps.value.includes(key)) {
      completedSteps.value = [...completedSteps.value, key]
    }
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
  <div :class="currentStep === 1 ? 'flex flex-col h-[calc(100vh-48px)] px-4 py-3' : 'max-w-5xl mx-auto px-6 py-8'">
    <!-- Page header -->
    <div :class="currentStep === 1 ? 'mb-3 shrink-0' : 'mb-8'">
      <h1 class="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style="text-wrap: balance">Deploy to Org</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">
        Push components to a target Salesforce org
      </p>
    </div>

    <!-- Wizard pill stepper -->
    <div :class="currentStep === 1 ? 'mb-3 shrink-0' : 'mb-8'">
      <GlassPillStepper
        :steps="steps"
        :current-step="currentStepKey"
        :completed-steps="completedSteps"
        @step-click="onStepClick"
      />
    </div>

    <!-- Step content with transitions -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
      mode="out-in"
    >
      <!-- ==================== STEP 1: Source ==================== -->
      <div v-if="currentStep === 0" key="step-0">
        <GlassCard padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Choose Source</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Select where to pull components from
          </p>

          <!-- Source type toggle -->
          <div class="mb-6">
            <GlassToggle
              :options="sourceTypeOptions"
              :model-value="sourceType"
              @update:model-value="selectSourceType($event)"
            />
          </div>

          <!-- Previous retrieves list -->
          <div v-if="sourceType === 'retrieve'">
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
              <GlassCard
                v-for="ret in previousRetrieves"
                :key="ret.id || ret.workspacePath"
                hover
                padding="sm"
                class="cursor-pointer transition-all"
                :class="selectedRetrieve === ret ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)]' : ''"
                @click="selectRetrieve(ret)"
              >
                <div class="flex items-center justify-between">
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
                </div>
              </GlassCard>
            </div>
          </div>

          <!-- Source org selection -->
          <div v-if="sourceType === 'org'" class="max-w-sm">
            <OrgDropdown v-model="sourceOrg" label="Source Org" />
          </div>

          <!-- Next button -->
          <div class="mt-6 flex justify-end">
            <GlassButton
              variant="primary"
              :disabled="!canAdvanceStep1"
              @click="nextStep"
            >
              Next
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      <!-- ==================== STEP 2: Select Components ==================== -->
      <div v-else-if="currentStep === 1" key="step-1" class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <GlassCard padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Select Components</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Choose which components to deploy
          </p>

          <!-- From previous retrieve: checkbox list -->
          <div v-if="sourceType === 'retrieve' && selectedRetrieve" class="rounded-[var(--radius-md)] border border-[var(--glass-border)] overflow-hidden">
            <div class="px-4 py-3 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-bg)]">
              <div class="flex items-center gap-2">
                <span class="text-sm text-[var(--text-secondary)]">
                  {{ selectedComponents.length }} of {{ (selectedRetrieve.components || []).length }} selected
                </span>
                <GlassBadge variant="info" size="sm">{{ selectedComponents.length }}</GlassBadge>
              </div>
              <div class="flex gap-3">
                <button
                  class="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 cursor-pointer transition-colors"
                  @click="selectedComponents = (selectedRetrieve.components || []).map(c => ({ fullName: c.fullName || c.name, type: c.type }))"
                >
                  Select All
                </button>
                <button
                  class="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer transition-colors"
                  @click="selectedComponents = []"
                >
                  Clear
                </button>
              </div>
            </div>
            <div class="max-h-96 overflow-y-auto divide-y divide-[var(--glass-border)]">
              <div
                v-for="comp in (selectedRetrieve.components || [])"
                :key="`${comp.type}:${comp.fullName || comp.name}`"
                class="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--glass-bg-hover)] cursor-pointer transition-colors"
                @click="toggleRetrieveComponent(comp)"
              >
                <span
                  class="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                  :class="isRetrieveComponentSelected(comp)
                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                    : 'border-[var(--glass-border)]'"
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
          <div v-if="sourceType === 'org' && sourceOrg" class="flex-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] overflow-hidden">
            <MetadataTree
              :org-alias="sourceOrg"
              v-model="selectedComponents"
              :can-proceed="canAdvanceStep2"
              @back="prevStep"
              @next="nextStep"
            />
          </div>

          <!-- Navigation -->
          <div v-if="sourceType !== 'org'" class="mt-6 flex justify-between">
            <GlassButton variant="ghost" @click="prevStep">Back</GlassButton>
            <GlassButton
              variant="primary"
              :disabled="!canAdvanceStep2"
              @click="nextStep"
            >
              Next
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      <!-- ==================== STEP 3: Target Org ==================== -->
      <div v-else-if="currentStep === 2" key="step-2">
        <GlassCard padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Target Org</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Select the Salesforce org to deploy to
          </p>

          <div class="max-w-sm mb-5">
            <OrgDropdown v-model="targetOrg" label="Target Org" :exclude="sourceOrg" />
          </div>

          <!-- Health check status -->
          <div v-if="targetOrg" class="mb-5">
            <div v-if="healthStatus === 'checking'" class="flex items-center gap-2">
              <svg class="animate-spin w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span class="text-sm text-[var(--text-muted)]">Checking connection...</span>
            </div>
            <div v-else-if="healthStatus === 'healthy'" class="flex items-center gap-2">
              <GlassBadge variant="success">Connected</GlassBadge>
            </div>
            <div v-else-if="healthStatus === 'expired'" class="flex items-center gap-2">
              <GlassBadge variant="error">
                {{ healthError || 'Connection expired. Please reconnect on the Orgs page.' }}
              </GlassBadge>
            </div>
          </div>

          <!-- Production warning -->
          <GlassCard
            v-if="isProduction"
            padding="md"
            class="mb-5 border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5"
          >
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p class="text-sm font-semibold text-[var(--color-warning)]">Production Org</p>
                <p class="text-xs text-[var(--color-warning)]/80 mt-0.5">
                  You are deploying to a production environment. Extra confirmation will be required.
                </p>
              </div>
            </div>
          </GlassCard>

          <!-- Navigation -->
          <div class="flex justify-between">
            <GlassButton variant="ghost" @click="prevStep">Back</GlassButton>
            <GlassButton
              variant="primary"
              :disabled="!canAdvanceStep3"
              @click="nextStep"
            >
              Next
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      <!-- ==================== STEP 4: Validate ==================== -->
      <div v-else-if="currentStep === 3" key="step-3">
        <GlassCard padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Validate Deployment</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Running a dry-run validation against
            <span class="font-medium text-[var(--text-primary)]">{{ targetOrg }}</span>
          </p>

          <!-- Validating skeleton -->
          <div v-if="validating" class="flex flex-col items-center gap-3 py-12" role="status" aria-live="polite">
            <div aria-hidden="true" class="w-full max-w-md space-y-3">
              <GlassSkeleton variant="line" width="60%" height="14px" />
              <GlassSkeleton variant="rect" width="100%" height="8px" rounded="var(--radius-sm)" />
              <div class="flex justify-between">
                <GlassSkeleton variant="line" width="100px" height="12px" />
                <GlassSkeleton variant="line" width="40px" height="12px" />
              </div>
            </div>
            <span class="sr-only">Validating deployment...</span>
          </div>

          <!-- Validation error -->
          <div v-else-if="validationError" class="space-y-4">
            <GlassCard padding="md" class="border border-[var(--color-error)]/30 bg-[var(--color-error)]/5">
              <p class="text-sm text-[var(--color-error)] font-medium mb-1">Validation Failed</p>
              <p class="text-sm text-[var(--text-secondary)]">{{ validationError }}</p>
              <p v-if="validationAction" class="text-xs text-[var(--text-muted)] mt-2">
                <span class="font-medium text-[var(--color-warning)]">Suggested fix:</span> {{ validationAction }}
              </p>
            </GlassCard>

            <!-- Component-level failures -->
            <GlassCard v-if="validationFailures.length > 0" padding="none">
              <div class="px-4 py-2.5 border-b border-[var(--glass-border)]">
                <p class="text-xs font-medium text-[var(--text-muted)]">
                  {{ validationFailures.length }} component{{ validationFailures.length !== 1 ? 's' : '' }} failed
                </p>
              </div>
              <div class="max-h-64 overflow-y-auto divide-y divide-[var(--glass-border)]">
                <div v-for="(f, i) in validationFailures" :key="i" class="px-4 py-3">
                  <div class="flex items-center gap-2 mb-1">
                    <svg class="w-3.5 h-3.5 text-[var(--color-error)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span class="text-xs font-mono text-[var(--text-muted)]">{{ f.type }}</span>
                    <span class="text-sm font-medium text-[var(--text-primary)]">{{ f.name }}</span>
                    <span v-if="f.line" class="text-xs text-[var(--text-muted)]">line {{ f.line }}</span>
                  </div>
                  <p class="text-xs text-[var(--color-error)]/80 pl-5">{{ f.problem }}</p>
                </div>
              </div>
            </GlassCard>

            <div class="flex gap-3">
              <GlassButton variant="ghost" @click="prevStep">Back</GlassButton>
              <GlassButton variant="primary" @click="runValidation">Re-validate</GlassButton>
            </div>
          </div>

          <!-- Validation results -->
          <div v-else-if="validationResults.length > 0" class="space-y-4">
            <!-- Success banner -->
            <GlassCard
              v-if="validationPassed"
              padding="md"
              class="border border-[var(--color-success)]/30 bg-[var(--color-success)]/5"
            >
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-[var(--color-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm text-[var(--color-success)] font-semibold">
                  Validation passed. Safe to deploy.
                </p>
              </div>
            </GlassCard>

            <!-- Failure banner -->
            <GlassCard
              v-if="validationFailed"
              padding="md"
              class="border border-[var(--color-error)]/30 bg-[var(--color-error)]/5"
            >
              <p class="text-sm text-[var(--color-error)] font-semibold mb-1">
                Validation failed for some components.
              </p>
              <p class="text-xs text-[var(--color-error)]/80">Review the results below and adjust your selection.</p>
            </GlassCard>

            <!-- Per-component results -->
            <GlassCard padding="none">
              <div class="max-h-80 overflow-y-auto divide-y divide-[var(--glass-border)]">
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
            </GlassCard>

            <!-- Navigation -->
            <div class="flex justify-between pt-2">
              <GlassButton variant="ghost" @click="prevStep">Back</GlassButton>
              <div class="flex gap-3">
                <GlassButton
                  v-if="validationFailed"
                  variant="secondary"
                  @click="runValidation"
                >
                  Re-validate
                </GlassButton>
                <GlassButton
                  v-if="validationPassed"
                  variant="primary"
                  @click="nextStep"
                >
                  Deploy Now
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <!-- ==================== STEP 5: Deploy ==================== -->
      <div v-else-if="currentStep === 4" key="step-4">
        <!-- Pre-deploy: show summary and deploy button -->
        <GlassCard v-if="!deploying && !operationId && !deployError" padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-5">Deploy</h2>

          <GlassCard padding="md" class="mb-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--text-secondary)]">Target</span>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-[var(--text-primary)]">{{ targetOrg }}</span>
                  <GlassBadge v-if="isProduction" variant="error" size="sm">PROD</GlassBadge>
                </div>
              </div>
              <div class="h-px bg-[var(--glass-border)]" />
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--text-secondary)]">Components</span>
                <span class="text-sm font-medium text-[var(--text-primary)]">{{ selectedComponents.length }}</span>
              </div>
              <div class="h-px bg-[var(--glass-border)]" />
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--text-secondary)]">Validation</span>
                <GlassBadge variant="success" size="sm">Passed</GlassBadge>
              </div>
            </div>
          </GlassCard>

          <div class="flex justify-between">
            <GlassButton variant="ghost" @click="prevStep">Back</GlassButton>
            <GlassButton
              :variant="isProduction ? 'danger' : 'primary'"
              :loading="lockChecking"
              :disabled="lockChecking"
              @click="initiateDeployment"
            >
              <span v-if="lockChecking">Checking...</span>
              <span v-else>Deploy Now</span>
            </GlassButton>
          </div>
        </GlassCard>

        <!-- Deploy error without operation -->
        <GlassCard v-if="deployError && !operationId" padding="lg">
          <GlassCard padding="md" class="mb-5 border border-[var(--color-error)]/30 bg-[var(--color-error)]/5">
            <p class="text-sm text-[var(--color-error)] font-medium mb-1">Deploy failed</p>
            <p class="text-xs text-[var(--color-error)]/80">{{ deployError }}</p>
          </GlassCard>
          <div class="flex gap-3">
            <GlassButton variant="ghost" @click="prevStep">Back</GlassButton>
            <GlassButton variant="primary" @click="initiateDeployment">Retry</GlassButton>
          </div>
        </GlassCard>

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

          <GlassCard
            v-if="rollbackStatus === 'error'"
            padding="md"
            class="mt-4 border border-[var(--color-error)]/30 bg-[var(--color-error)]/5"
          >
            <p class="text-sm text-[var(--color-error)] font-medium mb-1">Rollback not available</p>
            <p class="text-xs text-[var(--text-secondary)] mt-1">{{ rollbackError }}</p>
            <p class="text-xs text-[var(--text-muted)] mt-2">To undo this deploy, retrieve the previous version of the components from the source org and deploy them to the target.</p>
          </GlassCard>

          <!-- Post-deploy actions (show only after deploy completes) -->
          <div v-if="deployCompleted && rollbackStatus !== 'running'" class="flex flex-wrap gap-3 mt-6">
            <GlassButton variant="primary" @click="resetWizard">Deploy More</GlassButton>
            <GlassButton variant="ghost" @click="goToHistory">View History</GlassButton>
            <template v-if="deployFailed && rollbackStatus === ''">
              <GlassButton variant="secondary" @click="retryFailed">Retry Failed Only</GlassButton>
              <GlassButton variant="danger" @click="rollbackDeploy">Rollback</GlassButton>
            </template>
          </div>
        </div>
      </div>
    </Transition>

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
