<script setup>
import { ref } from 'vue'
import { useApi } from '../composables/useApi'
import GlassCard from './glass/GlassCard.vue'
import GlassButton from './glass/GlassButton.vue'
import GlassBadge from './glass/GlassBadge.vue'

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
  <div class="flex items-center justify-center min-h-screen" style="background: linear-gradient(135deg, var(--bg-base) 0%, var(--bg-base-end) 100%);">
    <div class="max-w-lg w-full mx-4">
      <GlassCard padding="lg" glow>
        <!-- Icon -->
        <div class="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--color-error-bg)] border border-[var(--color-error-border)]">
          <svg class="w-8 h-8 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
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
            class="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)] backdrop-blur-sm"
            :class="check.status === 'pass'
              ? 'bg-[var(--color-success-bg)] border border-[var(--color-success-border)]'
              : 'bg-[var(--color-error-bg)] border border-[var(--color-error-border)]'"
          >
            <!-- Pass icon -->
            <svg v-if="check.status === 'pass'" class="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <!-- Fail icon -->
            <svg v-else class="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <p class="text-sm font-medium" :class="check.status === 'pass' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'">
                  {{ check.name }}
                </p>
                <GlassBadge :variant="check.status === 'pass' ? 'success' : 'error'" size="sm">
                  {{ check.status === 'pass' ? 'Pass' : 'Fail' }}
                </GlassBadge>
              </div>
              <p class="text-xs mt-0.5" :class="check.status === 'pass' ? 'text-[var(--color-success)]/70' : 'text-[var(--color-error)]/70'">
                {{ check.message }}
              </p>
              <p v-if="check.status === 'fail' && installInstructions[check.name]" class="text-xs text-[var(--text-muted)] mt-1.5 font-mono">
                {{ installInstructions[check.name] }}
              </p>
            </div>
          </div>
        </div>

        <!-- Retry button -->
        <GlassButton
          variant="primary"
          size="lg"
          :loading="retrying"
          class="w-full"
          @click="retry"
        >
          {{ retrying ? 'Checking...' : 'Retry' }}
        </GlassButton>
      </GlassCard>
    </div>
  </div>
</template>
