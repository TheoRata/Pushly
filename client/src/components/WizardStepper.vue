<script setup>
defineProps({
  steps: {
    type: Array,
    required: true,
  },
  currentStep: {
    type: Number,
    default: 0,
  },
})
</script>

<template>
  <div class="flex items-center w-full">
    <template v-for="(step, i) in steps" :key="i">
      <!-- Connector line (not before first step) -->
      <div
        v-if="i > 0"
        class="flex-1 h-0.5 transition-colors duration-300"
        :class="i <= currentStep ? 'bg-[var(--color-primary)]' : 'bg-[var(--text-muted)]/30'"
      />

      <!-- Step circle -->
      <div class="flex flex-col items-center gap-1.5 shrink-0">
        <div
          class="flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all duration-300 border-2"
          :class="[
            i < currentStep
              ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
              : i === currentStep
                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                : 'bg-transparent border-[var(--text-muted)]/40 text-[var(--text-muted)]'
          ]"
        >
          <!-- Checkmark for completed -->
          <svg
            v-if="i < currentStep"
            class="w-4.5 h-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <!-- Number for current / future -->
          <span v-else>{{ i + 1 }}</span>
        </div>

        <span
          class="text-xs font-medium transition-colors duration-300 whitespace-nowrap"
          :class="[
            i < currentStep
              ? 'text-[var(--color-success)]'
              : i === currentStep
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)]'
          ]"
        >
          {{ step.label }}
        </span>
      </div>
    </template>
  </div>
</template>
