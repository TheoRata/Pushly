<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  text: { type: String, default: 'Button' },
  loadingText: { type: String, default: 'Processing...' },
  successText: { type: String, default: 'Complete!' },
  /** If true, the button manages its own loading/success cycle on click (demo mode) */
  demo: { type: Boolean, default: false },
  /** External status control — overrides internal state when provided */
  status: { type: String, default: null, validator: (v) => ['idle', 'loading', 'success', null].includes(v) },
})

const emit = defineEmits(['click'])

const internalStatus = ref('idle')

const currentStatus = computed(() => props.status ?? internalStatus.value)
const isIdle = computed(() => currentStatus.value === 'idle')

function handleClick() {
  if (currentStatus.value !== 'idle') return

  emit('click')

  if (props.demo) {
    internalStatus.value = 'loading'
    setTimeout(() => {
      internalStatus.value = 'success'
      setTimeout(() => {
        internalStatus.value = 'idle'
      }, 3000)
    }, 2000)
  }
}
</script>

<template>
  <button
    class="group relative flex min-w-[160px] items-center justify-center overflow-hidden rounded-full border border-[var(--glass-border)] p-2 px-6 font-semibold text-sm transition-all duration-300"
    :class="currentStatus === 'loading' && 'px-2'"
    style="background: var(--glass-bg); backdrop-filter: var(--glass-blur);"
    @click="handleClick"
  >
    <div class="flex items-center gap-2">
      <!-- Expanding dot -->
      <div
        class="h-2 w-2 rounded-full transition-all duration-500 group-hover:scale-[100]"
        :class="!isIdle ? 'scale-[100]' : ''"
        style="background: var(--color-primary);"
      />

      <!-- Default text (slides out on hover) -->
      <span
        class="inline-block text-[var(--text-primary)] transition-all duration-500 group-hover:translate-x-20 group-hover:opacity-0"
        :class="!isIdle ? 'translate-x-20 opacity-0' : ''"
      >
        {{ text }}
      </span>

      <!-- Overlay content (slides in on hover) -->
      <div
        class="absolute top-0 left-0 z-10 flex h-full w-full -translate-x-16 items-center justify-center gap-2 text-white opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
        :class="!isIdle ? 'translate-x-0 opacity-100' : ''"
      >
        <!-- Idle hover state -->
        <template v-if="currentStatus === 'idle'">
          <span>{{ text }}</span>
          <!-- Arrow Right -->
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </template>

        <!-- Loading state -->
        <template v-else-if="currentStatus === 'loading'">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>{{ loadingText }}</span>
        </template>

        <!-- Success state -->
        <template v-else>
          <!-- Check icon -->
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span>{{ successText }}</span>
        </template>
      </div>
    </div>
  </button>
</template>
