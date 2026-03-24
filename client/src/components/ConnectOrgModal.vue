<script setup>
import { ref, onUnmounted } from 'vue'
import { useOrgs } from '../composables/useOrgs'

const emit = defineEmits(['connected', 'close'])

const { connectOrg, checkHealth } = useOrgs()

const orgType = ref('sandbox')
const alias = ref('')
const step = ref('form') // form | waiting | success | error
const errorMessage = ref('')
let pollTimer = null
let timeoutTimer = null

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
    await connectOrg(alias.value.trim(), orgType.value)
  } catch (err) {
    step.value = 'error'
    errorMessage.value = err.message || 'Failed to initiate connection'
    return
  }

  // Poll for health every 2 seconds
  pollTimer = setInterval(async () => {
    try {
      const health = await checkHealth(alias.value.trim())
      if (health && health.connected) {
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
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

      <!-- Modal -->
      <div class="relative w-full max-w-md mx-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">Connect Salesforce Org</h2>
          <button
            class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            @click="close"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="px-6 py-5">
          <!-- Form step -->
          <template v-if="step === 'form'">
            <!-- Org type selector -->
            <label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">Org Type</label>
            <div class="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                class="px-4 py-3 rounded-lg border text-sm font-medium transition-all cursor-pointer"
                :class="orgType === 'production'
                  ? 'border-[var(--color-error)]/50 bg-[var(--color-error)]/10 text-[var(--color-error)]'
                  : 'border-white/10 bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-white/20'"
                @click="orgType = 'production'"
              >
                Production Org
              </button>
              <button
                type="button"
                class="px-4 py-3 rounded-lg border text-sm font-medium transition-all cursor-pointer"
                :class="orgType === 'sandbox'
                  ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-white/10 bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-white/20'"
                @click="orgType = 'sandbox'"
              >
                Sandbox
              </button>
            </div>

            <!-- Alias input -->
            <label class="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Friendly Name</label>
            <input
              v-model="alias"
              type="text"
              placeholder="e.g. my-dev-sandbox"
              class="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-primary)] border border-white/10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />

            <p class="mt-4 text-xs text-[var(--text-muted)] leading-relaxed">
              You'll be redirected to Salesforce to log in. This app will be granted permission to read and deploy metadata on your behalf.
            </p>

            <button
              class="mt-5 w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              :disabled="!alias.trim()"
              @click="startLogin"
            >
              Log in to Salesforce
            </button>
          </template>

          <!-- Waiting step -->
          <template v-if="step === 'waiting'">
            <div class="flex flex-col items-center py-6">
              <!-- Spinner -->
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
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-success)]/15 mb-4">
                <svg class="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p class="text-[var(--text-primary)] font-medium text-sm">Org connected successfully!</p>
              <button
                class="mt-5 px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary)]/90 transition-colors cursor-pointer"
                @click="close"
              >
                Done
              </button>
            </div>
          </template>

          <!-- Error step -->
          <template v-if="step === 'error'">
            <div class="flex flex-col items-center py-6">
              <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-error)]/15 mb-4">
                <svg class="w-6 h-6 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p class="text-[var(--color-error)] font-medium text-sm">{{ errorMessage }}</p>
              <button
                class="mt-5 px-6 py-2 rounded-lg bg-white/10 text-[var(--text-primary)] text-sm font-medium hover:bg-white/15 transition-colors cursor-pointer"
                @click="step = 'form'"
              >
                Try Again
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
