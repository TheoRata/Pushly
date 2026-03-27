<script setup>
defineProps({
  variant: { type: String, default: 'info', validator: (v) => ['success', 'error', 'warning', 'info', 'purple'].includes(v) },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md'].includes(v) },
})
</script>

<template>
  <span
    class="inline-flex items-center font-medium"
    :class="[
      {
        'px-1.5 py-0.5 text-[10px] rounded-[var(--radius-sm)]': size === 'sm',
        'px-2 py-0.5 text-xs rounded-[var(--radius-sm)]': size === 'md',
      },
      variant === 'success' && 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
      variant === 'error' && 'bg-[var(--color-error-bg)] text-[var(--color-error)] border border-[var(--color-error-border)]',
      variant === 'warning' && 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]',
      variant === 'info' && 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info-border)]',
      variant === 'purple' && 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] border border-[var(--color-primary-border)]',
    ]"
  >
    <slot />
  </span>
</template>
