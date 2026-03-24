<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import { useWebSocket } from '../composables/useWebSocket'
import WizardStepper from '../components/WizardStepper.vue'
import OrgDropdown from '../components/OrgDropdown.vue'
import MetadataTree from '../components/MetadataTree.vue'
import ProgressTracker from '../components/ProgressTracker.vue'

const router = useRouter()
const api = useApi()
const { orgs, checkHealth } = useOrgs()
const { on } = useWebSocket()

const steps = [
  { label: 'Source Org' },
  { label: 'Select Components' },
  { label: 'Review' },
  { label: 'Retrieve' },
]

const currentStep = ref(0)
const selectedOrg = ref('')
const selectedComponents = ref([])
const retrieveMode = ref('cherry-pick') // 'all' | 'cherry-pick'
const operationId = ref(null)
const retrieveStatus = ref(null) // null | 'running' | 'success' | 'error'
const retrieveError = ref('')
const retrievedCount = ref(0)
const workspaceId = ref(null)
const authChecking = ref(false)
const authOk = ref(false)

// Computed helpers
const selectedOrgObj = computed(() => orgs.value.find((o) => o.alias === selectedOrg.value))
const canProceedStep1 = computed(() => selectedOrg.value && authOk.value)
const canProceedStep2 = computed(() =>
  retrieveMode.value === 'all' || selectedComponents.value.length > 0
)
const componentCount = computed(() =>
  retrieveMode.value === 'all' ? 'All metadata' : `${selectedComponents.value.length} component${selectedComponents.value.length !== 1 ? 's' : ''}`
)

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
  if (currentStep.value < steps.length - 1) {
    if (currentStep.value === 2) {
      startRetrieve()
    }
    currentStep.value++
  }
}

function back() {
  if (currentStep.value > 0) {
    currentStep.value--
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
  retrieveStatus.value = 'success'
  const count = data.components?.filter((c) => c.status === 'succeeded').length
  retrievedCount.value = count || selectedComponents.value.length || 0
})

on('operation:error', (data) => {
  if (data.operationId !== operationId.value) return
  retrieveStatus.value = 'error'
  retrieveError.value = data.message || 'Retrieve operation failed'
})

function deployThese() {
  const query = { from: 'retrieve' }
  if (workspaceId.value) query.workspaceId = workspaceId.value
  router.push({ path: '/deploy', query })
}

function resetWizard() {
  currentStep.value = 0
  selectedOrg.value = ''
  selectedComponents.value = []
  retrieveMode.value = 'cherry-pick'
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
  currentStep.value = 1
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Page header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Retrieve Components</h1>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">Pull metadata from a Salesforce org</p>
    </div>

    <!-- Wizard stepper -->
    <div class="mb-8 px-4">
      <WizardStepper :steps="steps" :current-step="currentStep" />
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
      <div v-if="currentStep === 0" key="step-0">
        <div class="rounded-xl bg-[var(--bg-surface)] border border-white/5 p-6">
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
            <svg class="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span class="text-sm text-[var(--color-success)]">Connected</span>
          </div>
          <div v-else-if="selectedOrg && !authChecking && !authOk" class="mt-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span class="text-sm text-[var(--color-error)]">Connection failed. Please reconnect this org.</span>
          </div>

          <!-- Next button -->
          <div class="mt-6 flex justify-end">
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
              :class="
                canProceedStep1
                  ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 shadow-lg shadow-[var(--color-primary)]/25'
                  : 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed'
              "
              :disabled="!canProceedStep1"
              @click="next"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== STEP 2: Select Components ==================== -->
      <div v-else-if="currentStep === 1" key="step-1">
        <div class="rounded-xl bg-[var(--bg-surface)] border border-white/5 p-6">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Select Components</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Choose which metadata to retrieve from {{ selectedOrgObj?.alias || selectedOrg }}
          </p>

          <!-- Mode toggle -->
          <div class="flex gap-2 mb-5">
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border"
              :class="
                retrieveMode === 'all'
                  ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
                  : 'bg-[var(--bg-primary)] border-white/10 text-[var(--text-secondary)] hover:bg-white/5'
              "
              @click="retrieveMode = 'all'"
            >
              All Changes
            </button>
            <button
              class="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border"
              :class="
                retrieveMode === 'cherry-pick'
                  ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-[var(--color-primary)]'
                  : 'bg-[var(--bg-primary)] border-white/10 text-[var(--text-secondary)] hover:bg-white/5'
              "
              @click="retrieveMode = 'cherry-pick'"
            >
              Cherry Pick
            </button>
          </div>

          <!-- All changes info -->
          <div v-if="retrieveMode === 'all'" class="rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 p-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-[var(--color-primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p class="text-sm text-[var(--text-primary)] font-medium">All metadata will be retrieved from this org</p>
                <p class="text-xs text-[var(--text-muted)] mt-1">
                  This may take several minutes for large orgs with many customizations.
                </p>
              </div>
            </div>
          </div>

          <!-- Cherry pick tree -->
          <div v-else class="rounded-lg border border-white/5 overflow-hidden" style="max-height: 480px;">
            <MetadataTree
              :org-alias="selectedOrg"
              :model-value="selectedComponents"
              @update:model-value="selectedComponents = $event"
            />
          </div>

          <!-- Navigation -->
          <div class="mt-6 flex justify-between">
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
              @click="back"
            >
              Back
            </button>
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
              :class="
                canProceedStep2
                  ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/80 shadow-lg shadow-[var(--color-primary)]/25'
                  : 'bg-white/5 text-[var(--text-muted)] cursor-not-allowed'
              "
              :disabled="!canProceedStep2"
              @click="next"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== STEP 3: Review ==================== -->
      <div v-else-if="currentStep === 2" key="step-2">
        <div class="rounded-xl bg-[var(--bg-surface)] border border-white/5 p-6">
          <h2 class="text-lg font-semibold text-[var(--text-primary)] mb-1">Review</h2>
          <p class="text-sm text-[var(--text-muted)] mb-5">
            Confirm the details before starting the retrieve
          </p>

          <!-- Summary card -->
          <div class="rounded-lg bg-[var(--bg-primary)] border border-white/5 p-5 space-y-4">
            <!-- Source org -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-[var(--text-muted)]">Source Org</span>
              <span class="text-sm font-medium text-[var(--text-primary)]">
                {{ selectedOrgObj?.alias || selectedOrg }}
              </span>
            </div>

            <div class="h-px bg-white/5" />

            <!-- Mode -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-[var(--text-muted)]">Mode</span>
              <span class="text-sm font-medium text-[var(--text-primary)]">
                {{ retrieveMode === 'all' ? 'All Metadata' : 'Cherry Pick' }}
              </span>
            </div>

            <div class="h-px bg-white/5" />

            <!-- Component count -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-[var(--text-muted)]">Components</span>
              <span class="text-sm font-medium text-[var(--color-primary)]">
                {{ componentCount }}
              </span>
            </div>

            <!-- Selected components list (cherry-pick only) -->
            <template v-if="retrieveMode === 'cherry-pick' && selectedComponents.length > 0">
              <div class="h-px bg-white/5" />
              <div class="max-h-48 overflow-y-auto rounded-md bg-[var(--bg-surface)] border border-white/5 p-3">
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

          <!-- Navigation -->
          <div class="mt-6 flex justify-between">
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
              @click="back"
            >
              Back
            </button>
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
              @click="next"
            >
              Start Retrieve
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== STEP 4: Retrieve Progress ==================== -->
      <div v-else-if="currentStep === 3" key="step-3">
        <!-- Progress tracker -->
        <div v-if="operationId" class="mb-6">
          <ProgressTracker :operation-id="operationId" />
        </div>

        <!-- Error (no operationId - request itself failed) -->
        <div
          v-if="retrieveStatus === 'error' && !operationId"
          class="rounded-xl bg-[var(--bg-surface)] border border-[var(--color-error)]/20 p-6"
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
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
              @click="tryAgain"
            >
              Try Again
            </button>
          </div>
        </div>

        <!-- Success summary -->
        <div
          v-if="retrieveStatus === 'success'"
          class="rounded-xl bg-[var(--color-success)]/5 border border-[var(--color-success)]/20 p-6 mt-4"
        >
          <div class="flex items-center gap-3 mb-4">
            <svg class="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm font-medium text-[var(--color-success)]">
              Retrieved {{ retrievedCount }} components from {{ selectedOrgObj?.alias || selectedOrg }}
            </p>
          </div>
          <div class="flex gap-3">
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
              @click="deployThese"
            >
              Deploy These
            </button>
            <button
              class="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
              @click="resetWizard"
            >
              Done
            </button>
          </div>
        </div>

        <!-- Error from operation -->
        <div
          v-if="retrieveStatus === 'error' && operationId"
          class="rounded-xl bg-[var(--color-error)]/5 border border-[var(--color-error)]/20 p-6 mt-4"
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
          <button
            class="px-5 py-2.5 rounded-lg text-sm font-medium bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
            @click="tryAgain"
          >
            Try Again
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
