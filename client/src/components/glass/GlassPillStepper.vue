<script setup>
defineProps({
  steps: { type: Array, required: true },
  currentStep: { type: [String, Number], required: true },
  completedSteps: { type: Array, default: () => [] },
})

defineEmits(['step-click'])
</script>

<template>
  <div class="inline-flex p-1 gap-0.5 glass rounded-[var(--radius-md)]">
    <button
      v-for="(step, i) in steps"
      :key="step.key"
      :aria-current="currentStep === step.key ? 'step' : undefined"
      class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200"
      :class="[
        currentStep === step.key
          ? 'bg-gradient-to-r from-[var(--color-primary-bg)] to-[var(--color-primary-bg)] border border-[var(--color-primary-border)] text-[var(--text-primary)] glow-sm'
          : completedSteps.includes(step.key)
            ? 'text-[var(--color-primary)] hover:bg-[var(--glass-bg-hover)]'
            : 'text-[var(--text-muted)] cursor-default',
      ]"
      :disabled="!completedSteps.includes(step.key) && currentStep !== step.key"
      @click="(completedSteps.includes(step.key) || currentStep === step.key) && $emit('step-click', step.key)"
    >
      <span
        class="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
        :class="[
          completedSteps.includes(step.key)
            ? 'bg-[var(--color-primary)] text-white'
            : currentStep === step.key
              ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border border-[var(--color-primary-border)]'
              : 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-[var(--glass-border)]',
        ]"
      >
        <template v-if="completedSteps.includes(step.key)">&#10003;</template>
        <template v-else>{{ i + 1 }}</template>
      </span>
      {{ step.label }}
    </button>
  </div>
</template>
