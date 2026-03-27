<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[var(--color-primary-border)] focus:shadow-[0_0_8px_var(--color-primary-glow)] disabled:opacity-40 disabled:cursor-not-allowed"
      style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur)"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>
