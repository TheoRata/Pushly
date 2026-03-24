<script setup>
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps({
  checks: { type: Array, required: true },
})

const emit = defineEmits(['resolved'])

const { get } = useApi()
const retrying = ref(false)

const installInstructions = {
  'Node.js': 'Install Node.js 18+ from https://nodejs.org',
  'Salesforce CLI': 'Run: npm install @salesforce/cli -g',
}

async function retry() {
  retrying.value = true
  try {
    const result = await get('/prerequisites')
    if (result.ok) {
      emit('resolved')
    } else {
      // Update parent with new check results
      emit('resolved', result)
    }
  } catch {
    // Server unreachable - stay on error screen
  } finally {
    retrying.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-[var(--bg-base)]">
    <div class="max-w-lg w-full mx-4">
      <div class="rounded-2xl bg-[var(--bg-primary)] border border-white/5 p-8 shadow-xl">
        <!-- Icon -->
        <div class="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10">
          <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 class="text-xl font-bold text-[var(--text-primary)] text-center mb-2">Prerequisites Missing</h1>
        <p class="text-sm text-[var(--text-secondary)] text-center mb-6">
          Some required tools are not available. Please install them and retry.
        </p>

        <!-- Check list -->
        <div class="space-y-3 mb-8">
          <div
            v-for="check in checks"
            :key="check.name"
            class="flex items-start gap-3 px-4 py-3 rounded-lg"
            :class="check.status === 'pass'
              ? 'bg-emerald-500/5 border border-emerald-500/20'
              : 'bg-red-500/5 border border-red-500/20'"
          >
            <!-- Pass icon -->
            <svg v-if="check.status === 'pass'" class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <!-- Fail icon -->
            <svg v-else class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium" :class="check.status === 'pass' ? 'text-emerald-400' : 'text-red-400'">
                {{ check.name }}
              </p>
              <p class="text-xs mt-0.5" :class="check.status === 'pass' ? 'text-emerald-400/70' : 'text-red-400/70'">
                {{ check.message }}
              </p>
              <p v-if="check.status === 'fail' && installInstructions[check.name]" class="text-xs text-[var(--text-muted)] mt-1.5 font-mono">
                {{ installInstructions[check.name] }}
              </p>
            </div>
          </div>
        </div>

        <!-- Retry button -->
        <button
          class="w-full px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          :disabled="retrying"
          @click="retry"
        >
          <svg v-if="retrying" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ retrying ? 'Checking...' : 'Retry' }}
        </button>
      </div>
    </div>
  </div>
</template>
