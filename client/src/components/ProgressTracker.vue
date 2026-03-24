<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'

const props = defineProps({
  operationId: {
    type: String,
    required: true,
  },
})

const { on } = useWebSocket()

const progress = ref(0)
const status = ref('running') // running | success | error | partial
const components = ref([])
const message = ref('')
const errorMessage = ref('')
const logs = ref([])
const showDetails = ref(false)
const elapsedSeconds = ref(0)
let elapsedTimer = null

const completedCount = computed(() => components.value.filter((c) => c.status === 'succeeded').length)
const totalCount = computed(() => components.value.length)
const currentComponent = computed(() => components.value.find((c) => c.status === 'deploying'))

const elapsedDisplay = computed(() => {
  const m = Math.floor(elapsedSeconds.value / 60)
  const s = elapsedSeconds.value % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
})

function handleProgress(data) {
  if (data.operationId !== props.operationId) return
  progress.value = data.progress || 0
  if (data.components) components.value = data.components
  if (data.message) {
    message.value = data.message
    logs.value.push(data.message)
  }
}

function handleComplete(data) {
  if (data.operationId !== props.operationId) return
  clearInterval(elapsedTimer)
  progress.value = 100
  status.value = data.partial ? 'partial' : 'success'
  message.value = data.message || 'Operation completed successfully'
  if (data.components) components.value = data.components
}

function handleError(data) {
  if (data.operationId !== props.operationId) return
  clearInterval(elapsedTimer)
  status.value = 'error'
  errorMessage.value = data.message || 'Operation failed'
  if (data.components) components.value = data.components
}

onMounted(() => {
  on('operation:progress', handleProgress)
  on('operation:complete', handleComplete)
  on('operation:error', handleError)

  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
})

onUnmounted(() => {
  clearInterval(elapsedTimer)
})

function statusIcon(s) {
  switch (s) {
    case 'succeeded': return 'check'
    case 'failed': return 'x'
    case 'deploying': return 'spinner'
    default: return 'pending'
  }
}
</script>

<template>
  <div class="rounded-xl bg-[var(--bg-surface)] border border-white/5 overflow-hidden">
    <!-- Header -->
    <div class="px-5 py-4 border-b border-white/5">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-medium text-[var(--text-primary)]">
          <template v-if="status === 'running' && currentComponent">
            Deploying component {{ completedCount + 1 }} of {{ totalCount }}...
          </template>
          <template v-else-if="status === 'success'">
            Deployment complete
          </template>
          <template v-else-if="status === 'error'">
            Deployment failed
          </template>
          <template v-else-if="status === 'partial'">
            Deployment partially succeeded
          </template>
          <template v-else>
            Deploying...
          </template>
        </span>
        <span class="text-xs text-[var(--text-muted)]">{{ elapsedDisplay }}</span>
      </div>

      <!-- Progress bar -->
      <div class="h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :class="[
            status === 'error' ? 'bg-[var(--color-error)]'
              : status === 'partial' ? 'bg-[var(--color-warning)]'
              : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]'
          ]"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- End state banners -->
    <div
      v-if="status === 'success'"
      class="px-5 py-3 bg-[var(--color-success)]/10 border-b border-[var(--color-success)]/20"
    >
      <p class="text-sm text-[var(--color-success)] font-medium">
        All {{ totalCount }} components deployed successfully.
      </p>
    </div>
    <div
      v-if="status === 'error'"
      class="px-5 py-3 bg-[var(--color-error)]/10 border-b border-[var(--color-error)]/20"
    >
      <p class="text-sm text-[var(--color-error)] font-medium">{{ errorMessage }}</p>
    </div>
    <div
      v-if="status === 'partial'"
      class="px-5 py-3 bg-[var(--color-warning)]/10 border-b border-[var(--color-warning)]/20"
    >
      <p class="text-sm text-[var(--color-warning)] font-medium">
        {{ completedCount }} of {{ totalCount }} components deployed. Some components failed.
      </p>
    </div>

    <!-- Component rows -->
    <div v-if="components.length > 0" class="px-5 py-3 max-h-64 overflow-y-auto">
      <div
        v-for="comp in components"
        :key="comp.name"
        class="flex items-center gap-3 py-1.5"
      >
        <!-- Status icon -->
        <template v-if="statusIcon(comp.status) === 'check'">
          <svg class="w-4 h-4 text-[var(--color-success)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </template>
        <template v-else-if="statusIcon(comp.status) === 'x'">
          <svg class="w-4 h-4 text-[var(--color-error)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </template>
        <template v-else-if="statusIcon(comp.status) === 'spinner'">
          <svg class="w-4 h-4 text-[var(--color-primary)] animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </template>
        <template v-else>
          <div class="w-4 h-4 rounded-full border-2 border-[var(--text-muted)]/30 shrink-0" />
        </template>

        <span
          class="text-sm truncate"
          :class="comp.status === 'failed' ? 'text-[var(--color-error)]' : 'text-[var(--text-secondary)]'"
        >
          {{ comp.name }}
        </span>
      </div>
    </div>

    <!-- Collapsible log panel -->
    <div class="border-t border-white/5">
      <button
        class="flex items-center gap-2 w-full px-5 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
        @click="showDetails = !showDetails"
      >
        <svg
          class="w-3 h-3 transition-transform"
          :class="showDetails ? 'rotate-90' : ''"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        Show Details
      </button>
      <div
        v-if="showDetails"
        class="px-5 pb-4 max-h-48 overflow-y-auto"
      >
        <pre class="text-xs text-[var(--text-muted)] font-mono whitespace-pre-wrap leading-relaxed">{{ logs.join('\n') || 'No log output yet.' }}</pre>
      </div>
    </div>
  </div>
</template>
