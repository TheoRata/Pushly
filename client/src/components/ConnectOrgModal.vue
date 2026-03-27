<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useOrgs } from '../composables/useOrgs'
import GlassModal from './glass/GlassModal.vue'
import GlassToggle from './glass/GlassToggle.vue'
import GlassInput from './glass/GlassInput.vue'
import GlassButton from './glass/GlassButton.vue'

const emit = defineEmits(['connected', 'close'])

const { connectOrg, checkHealth } = useOrgs()

const orgType = ref('sandbox')
const alias = ref('')
const customDomain = ref('')
const useCustomDomain = ref(false)
const step = ref('form') // form | waiting | success | error
const errorMessage = ref('')
let pollTimer = null
let timeoutTimer = null

const orgTypeOptions = [
  { label: 'Sandbox', value: 'sandbox' },
  { label: 'Production', value: 'production' },
]

const domainPlaceholder = computed(() =>
  orgType.value === 'sandbox'
    ? 'mycompany--sandbox.sandbox.my.salesforce.com'
    : 'mycompany.my.salesforce.com'
)

function close() {
  clearTimers()
  emit('close')
}

function clearTimers() {
  clearInterval(pollTimer)
  clearTimeout(timeoutTimer)
  pollTimer = null
  timeoutTimer = null
}

async function startLogin() {
  if (!alias.value.trim()) return

  step.value = 'waiting'
  errorMessage.value = ''

  try {
    await connectOrg(
      alias.value.trim(),
      orgType.value,
      useCustomDomain.value ? customDomain.value.trim() : ''
    )
  } catch (err) {
    step.value = 'error'
    errorMessage.value = err.message || 'Failed to initiate connection'
    return
  }

  // Poll for health every 2 seconds
  pollTimer = setInterval(async () => {
    try {
      const health = await checkHealth(alias.value.trim())
      if (health && health.status === 'connected') {
        clearTimers()
        step.value = 'success'
        emit('connected', alias.value.trim())
      }
    } catch {
      // Keep polling
    }
  }, 2000)

  // Timeout after 120 seconds
  timeoutTimer = setTimeout(() => {
    clearInterval(pollTimer)
    step.value = 'error'
    errorMessage.value = 'Login timed out. Please try again.'
  }, 120000)
}

onUnmounted(clearTimers)
</script>

<template>
  <GlassModal :show="true" title="Connect Salesforce Org" max-width="480px" @close="close">
    <!-- Form step -->
    <template v-if="step === 'form'">
      <!-- Org type selector -->
      <div class="mb-5">
        <label class="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Org Type</label>
        <GlassToggle :options="orgTypeOptions" :model-value="orgType" @update:model-value="orgType = $event" />
      </div>

      <!-- Alias input -->
      <div class="mb-4">
        <GlassInput
          :model-value="alias"
          label="Friendly Name"
          placeholder="e.g. my-dev-sandbox"
          @update:model-value="alias = $event"
        />
      </div>

      <!-- Custom domain toggle -->
      <div class="mb-4">
        <label class="flex items-center gap-2 cursor-pointer group">
          <input
            v-model="useCustomDomain"
            type="checkbox"
            class="w-4 h-4 rounded border-white/20 bg-[var(--glass-bg)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/50 cursor-pointer accent-[var(--color-primary)]"
          />
          <span class="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            Use custom domain (My Domain)
          </span>
        </label>
      </div>

      <!-- Custom domain input -->
      <div v-if="useCustomDomain" class="mb-4">
        <GlassInput
          :model-value="customDomain"
          label="Custom Domain"
          :placeholder="domainPlaceholder"
          @update:model-value="customDomain = $event"
        />
        <p class="mt-1.5 text-xs text-[var(--text-muted)]">
          Your Salesforce My Domain URL. Found in Setup > My Domain.
        </p>
      </div>

      <p class="text-xs text-[var(--text-muted)] leading-relaxed">
        You'll be redirected to Salesforce to log in. This app will be granted permission to read and deploy metadata on your behalf.
      </p>
    </template>

    <!-- Waiting step -->
    <template v-if="step === 'waiting'">
      <div class="flex flex-col items-center py-6">
        <svg class="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p class="text-[var(--text-primary)] font-medium text-sm">Waiting for Salesforce login...</p>
        <p class="text-[var(--text-muted)] text-xs mt-2">Complete the login in your browser</p>
      </div>
    </template>

    <!-- Success step -->
    <template v-if="step === 'success'">
      <div class="flex flex-col items-center py-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-success-bg)] border border-[var(--color-success-border)] mb-4">
          <svg class="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p class="text-[var(--text-primary)] font-medium text-sm">Org connected successfully!</p>
      </div>
    </template>

    <!-- Error step -->
    <template v-if="step === 'error'">
      <div class="flex flex-col items-center py-6">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-error-bg)] border border-[var(--color-error-border)] mb-4">
          <svg class="w-6 h-6 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p class="text-[var(--color-error)] font-medium text-sm">{{ errorMessage }}</p>
      </div>
    </template>

    <!-- Footer slot: shown for form, success, error steps -->
    <template #footer>
      <GlassButton
        v-if="step === 'form'"
        variant="primary"
        size="md"
        :disabled="!alias.trim() || (useCustomDomain && !customDomain.trim())"
        class="w-full"
        @click="startLogin"
      >
        Log in to Salesforce
      </GlassButton>
      <GlassButton
        v-else-if="step === 'success'"
        variant="primary"
        size="md"
        @click="close"
      >
        Done
      </GlassButton>
      <GlassButton
        v-else-if="step === 'error'"
        variant="secondary"
        size="md"
        @click="step = 'form'"
      >
        Try Again
      </GlassButton>
    </template>
  </GlassModal>
</template>
