<script setup>
defineProps({
  variant: { type: String, default: 'primary', validator: (v) => ['primary', 'secondary', 'ghost', 'danger'].includes(v) },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
</script>

<template>
  <button
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[
      {
        'px-3 py-1.5 text-xs rounded-[var(--radius-sm)] gap-1.5': size === 'sm',
        'px-4 py-2 text-sm rounded-[var(--radius-md)] gap-2': size === 'md',
        'px-6 py-2.5 text-base rounded-[var(--radius-md)] gap-2': size === 'lg',
      },
      variant === 'primary' && 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-end)] text-white hover:shadow-[0_0_20px_var(--color-primary-glow)] active:scale-[0.98]',
      variant === 'secondary' && 'glass glass-hover text-[var(--text-primary)]',
      variant === 'ghost' && 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
      variant === 'danger' && 'bg-[var(--color-error-bg)] border border-[var(--color-error-border)] text-[var(--color-error)] hover:bg-[rgba(248,113,113,0.15)]',
    ]"
  >
    <svg v-if="loading" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>
