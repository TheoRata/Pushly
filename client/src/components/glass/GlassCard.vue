<script setup>
defineProps({
  hover: { type: Boolean, default: false },
  glow: { type: Boolean, default: false },
  padding: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg', 'none'].includes(v) },
})
</script>

<template>
  <div
    class="glass"
    :class="[
      hover && 'glass-hover transition-all duration-200 cursor-pointer',
      glow && 'glow',
      {
        'p-3': padding === 'sm',
        'p-5': padding === 'md',
        'p-7': padding === 'lg',
      },
    ]"
  >
    <slot />
  </div>
</template>
