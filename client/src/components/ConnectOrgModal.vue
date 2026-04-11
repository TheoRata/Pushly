<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useOrgs } from '../composables/useOrgs'
import GlassModal from './glass/GlassModal.vue'
import GlassInput from './glass/GlassInput.vue'
import GlassButton from './glass/GlassButton.vue'

const emit = defineEmits(['connected', 'close'])

const { connectOrg, checkHealth, getOAuthStatus, getOAuthUrl } = useOrgs()

const orgType = ref('sandbox')
const alias = ref('')
const customDomain = ref('')
const showAdvanced = ref(false)
const oauthConfigured = ref(false)
const step = ref('form') // form | waiting | success | error
const errorMessage = ref('')
let pollTimer = null
let timeoutTimer = null
let popupRef = null
let popupPollTimer = null

const domainPlaceholder = computed(() =>
  orgType.value === 'sandbox'
    ? 'mycompany--sandbox.sandbox.my.salesforce.com'
    : 'mycompany.my.salesforce.com'
)

onMounted(async () => {
  try {
    const status = await getOAuthStatus()
    oauthConfigured.value = status.configured === true
  } catch {
    oauthConfigured.value = false
  }
})

function close() {
  clearTimers()
  window.removeEventListener('message', onMessage)
  emit('close')
}

function clearTimers() {
  clearInterval(pollTimer)
  clearTimeout(timeoutTimer)
  clearInterval(popupPollTimer)
  pollTimer = null
  timeoutTimer = null
  popupPollTimer = null
}

function onMessage(event) {
  if (event.data?.type === 'oauth-success') {
    clearTimers()
    window.removeEventListener('message', onMessage)
    if (popupRef && !popupRef.closed) popupRef.close()
    step.value = 'success'
    emit('connected', event.data.alias || alias.value.trim())
  }
  if (event.data?.type === 'oauth-error') {
    clearTimers()
    window.removeEventListener('message', onMessage)
    if (popupRef && !popupRef.closed) popupRef.close()
    step.value = 'error'
    errorMessage.value = event.data.error || 'OAuth login failed'
  }
}

async function startLogin() {
  if (!alias.value.trim()) return

  step.value = 'waiting'
  errorMessage.value = ''

  if (oauthConfigured.value) {
    await startOAuthLogin()
  } else {
    await startFallbackLogin()
  }
}

async function startOAuthLogin() {
  try {
    const result = await getOAuthUrl(
      alias.value.trim(),
      orgType.value,
      customDomain.value.trim() || undefined
    )

    if (!result.url) {
      step.value = 'error'
      errorMessage.value = 'No OAuth URL returned from server'
      return
    }

    // Open centered popup
    const width = 600, height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    popupRef = window.open(result.url, 'pushly-oauth', `width=${width},height=${height},left=${left},top=${top}`)

    if (!popupRef || popupRef.closed) {
      step.value = 'error'
      errorMessage.value = 'Popup was blocked by the browser. Please allow popups for this site.'
      return
    }

    // Listen for postMessage from the popup
    window.addEventListener('message', onMessage)

    // Poll to detect if user closed the popup without completing
    popupPollTimer = setInterval(() => {
      if (popupRef.closed) {
        clearInterval(popupPollTimer)
        popupPollTimer = null
        if (step.value === 'waiting') {
          window.removeEventListener('message', onMessage)
          step.value = 'error'
          errorMessage.value = 'Login window was closed before completing'
        }
      }
    }, 1000)
  } catch (err) {
    step.value = 'error'
    errorMessage.value = err.message || 'Failed to start OAuth login'
  }
}

async function startFallbackLogin() {
  try {
    await connectOrg(
      alias.value.trim(),
      orgType.value,
      customDomain.value.trim() || ''
    )
  } catch (err) {
    step.value = 'error'
    errorMessage.value = err.message || 'Failed to initiate connection'
    return
  }

  pollTimer = setInterval(async () => {
    try {
      const health = await checkHealth(alias.value.trim())
      if (health && health.status === 'connected') {
        clearTimers()
        step.value = 'success'
        emit('connected', alias.value.trim())
      } else if (health && health.status === 'error') {
        clearTimers()
        step.value = 'error'
        errorMessage.value = health.error || 'Login failed. Please try again.'
      }
    } catch {}
  }, 2000)

  timeoutTimer = setTimeout(() => {
    clearInterval(pollTimer)
    step.value = 'error'
    errorMessage.value = 'Login timed out. Please try again.'
  }, 120000)
}

onUnmounted(() => {
  clearTimers()
  window.removeEventListener('message', onMessage)
})
</script>

<template>
  <GlassModal :show="true" title="Connect Salesforce Org" max-width="480px" @close="close">

    <!-- ===== FORM STEP ===== -->
    <template v-if="step === 'form'">

      <!-- Org type cards -->
      <div class="mb-5">
        <label class="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">What type of org?</label>
        <div class="grid grid-cols-2 gap-3">
          <button
            class="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border-2 transition-all duration-200"
            :class="orgType === 'sandbox'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
              : 'border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'"
            @click="orgType = 'sandbox'"
          >
            <svg class="w-6 h-6" :class="orgType === 'sandbox' ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            <span class="text-sm font-medium" :class="orgType === 'sandbox' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'">Sandbox</span>
            <span class="text-[10px] text-[var(--text-muted)]">Dev, QA, UAT</span>
          </button>

          <button
            class="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border-2 transition-all duration-200"
            :class="orgType === 'production'
              ? 'border-[var(--color-warning)] bg-[var(--color-warning-bg)]'
              : 'border-[var(--glass-border)] hover:border-[var(--glass-border-hover)]'"
            @click="orgType = 'production'"
          >
            <svg class="w-6 h-6" :class="orgType === 'production' ? 'text-[var(--color-warning)]' : 'text-[var(--text-muted)]'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            <span class="text-sm font-medium" :class="orgType === 'production' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'">Production</span>
            <span class="text-[10px] text-[var(--text-muted)]">Live org</span>
          </button>
        </div>
      </div>

      <!-- Friendly name -->
      <div class="mb-4">
        <GlassInput
          :model-value="alias"
          label="Give it a name"
          placeholder="e.g. Dev Sandbox, Production"
          @update:model-value="alias = $event"
        />
        <p class="mt-1 text-xs text-[var(--text-muted)]">A short name to identify this org in Pushly</p>
      </div>

      <!-- Advanced section -->
      <div class="mb-4">
        <button
          class="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
          @click="showAdvanced = !showAdvanced"
        >
          <svg
            class="w-3 h-3 transition-transform duration-200"
            :class="showAdvanced && 'rotate-90'"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
          Advanced options
        </button>

        <div v-if="showAdvanced" class="mt-3 space-y-3">
          <!-- Custom domain -->
          <GlassInput
            :model-value="customDomain"
            label="Custom Domain (My Domain)"
            :placeholder="domainPlaceholder"
            @update:model-value="customDomain = $event"
          />
          <p class="text-xs text-[var(--text-muted)]">
            Only needed if your org uses a custom My Domain URL. Found in Setup &rarr; My Domain.
          </p>
        </div>
      </div>

      <p class="text-xs text-[var(--text-muted)] leading-relaxed">
        {{ oauthConfigured
          ? 'A popup window will open for you to log in to Salesforce. We never see your password.'
          : 'A browser window will open for you to log in to Salesforce. We never see your password.'
        }}
      </p>
    </template>

    <!-- ===== WAITING ===== -->
    <template v-if="step === 'waiting'">
      <div class="flex flex-col items-center py-6">
        <svg class="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p class="text-[var(--text-primary)] font-medium text-sm">Waiting for Salesforce login...</p>
        <p class="text-[var(--text-muted)] text-xs mt-2">
          {{ oauthConfigured
            ? 'Complete the login in the popup window'
            : 'Complete the login in your browser'
          }}
        </p>
      </div>
    </template>

    <!-- ===== SUCCESS ===== -->
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

    <!-- ===== ERROR ===== -->
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

    <!-- ===== FOOTER ===== -->
    <template #footer>
      <GlassButton
        v-if="step === 'form'"
        variant="primary"
        size="md"
        :disabled="!alias.trim()"
        class="w-full"
        @click="startLogin"
      >
        Log in to Salesforce
      </GlassButton>
      <GlassButton
        v-if="step === 'success'"
        variant="primary"
        size="md"
        @click="close"
      >
        Done
      </GlassButton>
      <GlassButton
        v-if="step === 'error'"
        variant="secondary"
        size="md"
        @click="step = 'form'"
      >
        Try Again
      </GlassButton>
    </template>
  </GlassModal>
</template>
