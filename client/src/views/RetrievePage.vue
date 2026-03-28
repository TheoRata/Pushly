<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import { useWebSocket } from '../composables/useWebSocket'
import GlassPillStepper from '../components/glass/GlassPillStepper.vue'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassInput from '../components/glass/GlassInput.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'
import GlassToggle from '../components/glass/GlassToggle.vue'
import OrgDropdown from '../components/OrgDropdown.vue'
import MetadataTree from '../components/MetadataTree.vue'
import ProgressTracker from '../components/ProgressTracker.vue'

const router = useRouter()
const api = useApi()
const { orgs, checkHealth } = useOrgs()
const { on } = useWebSocket()

// Key-based steps for GlassPillStepper
const steps = [
  { label: 'Source', key: 'source' },
  { label: 'Components', key: 'components' },
  { label: 'Review', key: 'review' },
  { label: 'Execute', key: 'execute' },
]

const stepKeys = steps.map((s) => s.key)

// Numeric index kept for all existing logic — keys are derived from it
const currentStepIndex = ref(0)
const completedSteps = ref([])

const currentStepKey = computed(() => stepKeys[currentStepIndex.value])

const selectedOrg = ref('')
const selectedComponents = ref([])
const retrieveMode = ref('cherry-pick') // 'all' | 'cherry-pick'
const retrieveName = ref('')
const operationId = ref(null)
const retrieveStatus = ref(null) // null | 'running' | 'success' | 'error'
const retrieveError = ref('')
const retrievedCount = ref(0)
const workspaceId = ref(null)
const authChecking = ref(false)
const authOk = ref(false)

// Mode toggle options for GlassToggle
const modeOptions = [
  { label: 'All Changes', value: 'all' },
  { label: 'Cherry Pick', value: 'cherry-pick' },
]

// Computed helpers
const selectedOrgObj = computed(() => orgs.value.find((o) => o.alias === selectedOrg.value))
const canProceedStep1 = computed(() => selectedOrg.value && authOk.value)
const canProceedStep2 = computed(() =>
  retrieveMode.value === 'all' || selectedComponents.value.length > 0
)
const componentCount = computed(() =>
  retrieveMode.value === 'all' ? 'All metadata' : `${selectedComponents.value.length} component${selectedComponents.value.length !== 1 ? 's' : ''}`
)
const canStartRetrieve = computed(() => retrieveName.value.trim().length > 0)

// Pre-flight auth check
async function onOrgSelected(alias) {
  selectedOrg.value = alias
  authOk.value = false
  if (!alias) return
  authChecking.value = true
  try {
    await checkHealth(alias)
    authOk.value = true
  } catch {
    authOk.value = false
  } finally {
    authChecking.value = false
  }
}

// Navigation
function next() {
  if (currentStepIndex.value < steps.length - 1) {
    if (currentStepIndex.value === 2) {
      startRetrieve()
    }
    // Mark current step as completed before advancing
    const key = stepKeys[currentStepIndex.value]
    if (!completedSteps.value.includes(key)) {
      completedSteps.value = [...completedSteps.value, key]
    }
    currentStepIndex.value++
  }
}

function back() {
  if (currentStepIndex.value > 0) {
    currentStepIndex.value--
  }
}

function onStepClick(key) {
  const idx = stepKeys.indexOf(key)
  if (idx !== -1) {
    currentStepIndex.value = idx
  }
}

// Retrieve
async function startRetrieve() {
  retrieveStatus.value = 'running'
  retrieveError.value = ''
  try {
    const payload = {
      orgAlias: selectedOrg.value,
      mode: retrieveMode.value,
      name: retrieveName.value.trim() || undefined,
    }
    if (retrieveMode.value === 'cherry-pick') {
      payload.components = selectedComponents.value
    }
    const result = await api.post('/retrieve', payload)
    operationId.value = result.operationId
    workspaceId.value = result.workspaceId || null
  } catch (err) {
    retrieveStatus.value = 'error'
    retrieveError.value = err.message || 'Retrieve request failed'
  }
}

// Listen for WebSocket completion/error events
on('operation:complete', (data) => {
  if (data.operationId !== operationId.value) return
  if (data.status === 'failed') {
    retrieveStatus.value = 'error'
    retrieveError.value = data.summary?.error || 'Retrieve operation failed'
  } else {
    retrieveStatus.value = 'success'
    retrievedCount.value = data.summary?.componentList?.length || selectedComponents.value.length || 0
  }
})

on('operation:error', (data) => {
  if (data.operationId !== operationId.value) return
  retrieveStatus.value = 'error'
  retrieveError.value = data.message || 'Retrieve operation failed'
})

function deployThese() {
  const query = { from: 'retrieve' }
  if (operationId.value) query.retrieveId = operationId.value
  router.push({ path: '/deploy', query })
}

function resetWizard() {
  currentStepIndex.value = 0
  completedSteps.value = []
  selectedOrg.value = ''
  selectedComponents.value = []
  retrieveMode.value = 'cherry-pick'
  retrieveName.value = ''
  operationId.value = null
  retrieveStatus.value = null
  retrieveError.value = ''
  retrievedCount.value = 0
  workspaceId.value = null
  authOk.value = false
}

function tryAgain() {
  retrieveStatus.value = null
  operationId.value = null
  retrieveError.value = ''
  currentStepIndex.value = 1
}
</script>

<template>
  <div :class="currentStepIndex === 1 ? 'flex flex-col h-[calc(100vh-48px)] px-4 py-3' : 'max-w-5xl mx-auto px-6 py-8'">
    <!-- Page header -->
    <div :class="currentStepIndex === 1 ? 'mb-3 shrink-0' : 'mb-8'">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Retrieve Components</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">Pull metadata from a Salesforce org</p>
    </div>

    <!-- Wizard pill stepper -->
    <div :class="currentStepIndex === 1 ? 'mb-3 shrink-0' : 'mb-8'">
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
      <!-- ==================== STEP 1: Source Org ==================== -->
      <div v-if="currentStepIndex === 0" key="step-0">
        <GlassCard padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Source Org</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Choose the Salesforce org to retrieve metadata from
          </p>

          <div class="max-w-sm">
            <OrgDropdown
              :model-value="selectedOrg"
              label="Salesforce Org"
              @update:model-value="onOrgSelected"
            />
          </div>

          <!-- Auth check status -->
          <div v-if="selectedOrg && authChecking" class="mt-4 flex items-center gap-2">
            <svg class="animate-spin w-4 h-4 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span class="text-sm text-[var(--text-muted)]">Checking connection...</span>
          </div>
          <div v-else-if="selectedOrg && authOk" class="mt-4 flex items-center gap-2">
            <GlassBadge variant="success">Connected</GlassBadge>
          </div>
          <div v-else-if="selectedOrg && !authChecking && !authOk" class="mt-4 flex items-center gap-2">
            <GlassBadge variant="error">Connection failed. Please reconnect this org.</GlassBadge>
          </div>

          <!-- Next button -->
          <div class="mt-6 flex justify-end">
            <GlassButton
              variant="primary"
              :disabled="!canProceedStep1"
              @click="next"
            >
              Next
            </GlassButton>
          </div>
        </GlassCard>
      </div>

      <!-- ==================== STEP 2: Select Components ==================== -->
      <div v-else-if="currentStepIndex === 1" key="step-1" class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <!-- Mode toggle + header -->
        <div class="mb-3 shrink-0">
          <div class="flex items-center justify-between mb-2">
            <div>
              <h2 class="text-lg font-semibold text-[var(--text-primary)]">Select Components</h2>
              <p class="text-sm text-[var(--text-muted)]">
                Choose which metadata to retrieve from {{ selectedOrgObj?.alias || selectedOrg }}
              </p>
            </div>
            <GlassToggle
              :options="modeOptions"
              :model-value="retrieveMode"
              @update:model-value="retrieveMode = $event"
            />
          </div>
        </div>

        <!-- All changes info -->
        <div v-if="retrieveMode === 'all'" class="flex-1">
          <GlassCard padding="lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p class="text-sm text-[var(--text-primary)] font-medium">All metadata will be retrieved from this org</p>
                <p class="text-xs text-[var(--text-muted)] mt-1">This may take several minutes for large orgs with many customizations.</p>
              </div>
            </div>
            <div class="mt-6 flex justify-between">
              <GlassButton variant="ghost" @click="back">Back</GlassButton>
              <GlassButton variant="primary" @click="next">Next</GlassButton>
            </div>
          </GlassCard>
        </div>

        <!-- Cherry pick: MetadataTree fills remaining space with built-in footer -->
        <div v-else class="flex-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] overflow-hidden">
          <MetadataTree
            :org-alias="selectedOrg"
            :model-value="selectedComponents"
            :can-proceed="canProceedStep2"
            @update:model-value="selectedComponents = $event"
            @back="back"
            @next="next"
          />
        </div>
      </div>

      <!-- ==================== STEP 3: Review ==================== -->
      <div v-else-if="currentStepIndex === 2" key="step-2">
        <GlassCard padding="lg">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Review</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Confirm the details before starting the retrieve
          </p>

          <!-- Retrieve name (required) -->
          <div class="mb-5">
            <GlassInput
              v-model="retrieveName"
              label="Retrieve Name *"
              type="text"
              placeholder="e.g. Flow updates for March release"
            />
            <p class="mt-1.5 text-xs" :class="retrieveName.trim() ? 'text-[var(--text-muted)]' : 'text-[var(--color-error)]'">
              {{ retrieveName.trim() ? 'This name will be used for the workspace folder.' : 'A name is required to start the retrieve.' }}
            </p>
          </div>

          <!-- Summary card -->
          <GlassCard padding="md">
            <div class="space-y-4">
              <!-- Source org -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--text-muted)]">Source Org</span>
                <span class="text-sm font-medium text-[var(--text-primary)]">
                  {{ selectedOrgObj?.alias || selectedOrg }}
                </span>
              </div>

              <div class="h-px bg-[var(--glass-border)]" />

              <!-- Mode -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--text-muted)]">Mode</span>
                <span class="text-sm font-medium text-[var(--text-primary)]">
                  {{ retrieveMode === 'all' ? 'All Metadata' : 'Cherry Pick' }}
                </span>
              </div>

              <div class="h-px bg-[var(--glass-border)]" />

              <!-- Component count -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-[var(--text-muted)]">Components</span>
                <span class="text-sm font-medium text-[var(--color-primary)]">
                  {{ componentCount }}
                </span>
              </div>

              <!-- Selected components list (cherry-pick only) -->
              <template v-if="retrieveMode === 'cherry-pick' && selectedComponents.length > 0">
                <div class="h-px bg-[var(--glass-border)]" />
                <div class="max-h-48 overflow-y-auto rounded-[var(--radius-sm)] bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3">
                  <div
                    v-for="comp in selectedComponents"
                    :key="`${comp.type}:${comp.fullName}`"
                    class="flex items-center gap-2 py-1"
                  >
                    <span class="text-xs font-mono text-[var(--text-muted)] shrink-0 w-32 truncate">{{ comp.type }}</span>
                    <span class="text-sm text-[var(--text-primary)] truncate">{{ comp.fullName }}</span>
                  </div>
                </div>
              </template>
            </div>
          </GlassCard>

          <!-- Navigation -->
          <div class="mt-6 flex justify-between">
            <GlassButton variant="ghost" @click="back">Back</GlassButton>
            <GlassButton variant="primary" :disabled="!canStartRetrieve" @click="next">Start Retrieve</GlassButton>
          </div>
        </GlassCard>
      </div>

      <!-- ==================== STEP 4: Retrieve Progress ==================== -->
      <div v-else-if="currentStepIndex === 3" key="step-3">
        <!-- Progress tracker -->
        <div v-if="operationId" class="mb-6">
          <ProgressTracker :operation-id="operationId" operation-type="retrieve" />
        </div>

        <!-- Error (no operationId - request itself failed) -->
        <GlassCard
          v-if="retrieveStatus === 'error' && !operationId"
          padding="lg"
        >
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-[var(--color-error)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-[var(--color-error)]">Retrieve Failed</p>
              <p class="text-sm text-[var(--text-muted)] mt-1">{{ retrieveError }}</p>
            </div>
          </div>
          <div class="mt-5">
            <GlassButton variant="ghost" @click="tryAgain">Try Again</GlassButton>
          </div>
        </GlassCard>

        <!-- Success summary -->
        <GlassCard
          v-if="retrieveStatus === 'success'"
          padding="lg"
        >
          <div class="flex items-center gap-3 mb-5">
            <svg class="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-[var(--color-success)]">
              Retrieved {{ retrievedCount }} components from {{ selectedOrgObj?.alias || selectedOrg }}
            </p>
          </div>
          <div class="flex gap-3">
            <GlassButton variant="primary" @click="deployThese">Deploy These</GlassButton>
            <GlassButton variant="ghost" @click="resetWizard">Done</GlassButton>
          </div>
        </GlassCard>

        <!-- Error from operation -->
        <GlassCard
          v-if="retrieveStatus === 'error' && operationId"
          padding="lg"
        >
          <div class="flex items-start gap-3 mb-4">
            <svg class="w-6 h-6 text-[var(--color-error)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-[var(--color-error)]">Retrieve Failed</p>
              <p class="text-sm text-[var(--text-muted)] mt-1">{{ retrieveError }}</p>
            </div>
          </div>
          <GlassButton variant="ghost" @click="tryAgain">Try Again</GlassButton>
        </GlassCard>
      </div>
    </Transition>
  </div>
</template>
