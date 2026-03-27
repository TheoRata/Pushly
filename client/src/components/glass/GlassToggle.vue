<script setup>
const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [String, Number], default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="inline-flex p-1 gap-0.5 glass rounded-[var(--radius-md)]">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200"
      :class="
        modelValue === opt.value
          ? 'bg-[var(--color-primary-bg)] border border-[var(--color-primary-border)] text-[var(--text-primary)] glow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      "
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
