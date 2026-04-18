<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'rect',
    validator: (v) => ['line', 'circle', 'rect'].includes(v),
  },
  width: { type: String, default: '100%' },
  height: { type: String, default: null },
  rounded: { type: String, default: null },
})

const defaultHeight = { line: '14px', circle: '40px', rect: '80px' }
const defaultRounded = { line: 'var(--radius-sm)', circle: '9999px', rect: 'var(--radius-md)' }
</script>

<template>
  <div
    class="skeleton-pulse"
    :style="{
      width: variant === 'circle' ? (width !== '100%' ? width : defaultHeight.circle) : width,
      height: height || defaultHeight[variant],
      borderRadius: rounded || defaultRounded[variant],
    }"
  />
</template>
