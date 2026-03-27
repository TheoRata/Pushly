<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  glowColor: { type: String, default: 'purple', validator: (v) => ['blue', 'purple', 'green', 'red', 'orange'].includes(v) },
  padding: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg', 'none'].includes(v) },
})

const cardRef = ref(null)
const mouseX = ref(0)
const mouseY = ref(0)

const colorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
}

const config = computed(() => colorMap[props.glowColor])

function onPointerMove(e) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(() => {
  document.addEventListener('pointermove', onPointerMove)
})

onUnmounted(() => {
  document.removeEventListener('pointermove', onPointerMove)
})

const cardStyle = computed(() => {
  const xp = mouseX.value / (window.innerWidth || 1)
  const hue = config.value.base + xp * config.value.spread

  return {
    '--spotlight-x': `${mouseX.value}px`,
    '--spotlight-y': `${mouseY.value}px`,
    '--spotlight-hue': hue,
    '--spotlight-size': '250px',
  }
})
</script>

<template>
  <div
    ref="cardRef"
    class="glass-spotlight relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] transition-all duration-200 hover:border-[var(--glass-border-hover)]"
    :class="{
      'p-3': padding === 'sm',
      'p-5': padding === 'md',
      'p-7': padding === 'lg',
    }"
    :style="cardStyle"
  >
    <!-- Spotlight background glow -->
    <div
      class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      :class="$el?.matches(':hover') ? 'spotlight-visible' : ''"
    />
    <div class="relative z-10">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.glass-spotlight {
  background:
    radial-gradient(
      var(--spotlight-size, 250px) var(--spotlight-size, 250px) at var(--spotlight-x, 0px) var(--spotlight-y, 0px),
      hsla(var(--spotlight-hue, 280), 100%, 70%, 0) 0%,
      transparent 100%
    ),
    var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  transition: background 0s, border-color 0.2s;
}

.glass-spotlight:hover {
  background:
    radial-gradient(
      var(--spotlight-size, 250px) var(--spotlight-size, 250px) at var(--spotlight-x, 0px) var(--spotlight-y, 0px),
      hsla(var(--spotlight-hue, 280), 100%, 70%, 0.08) 0%,
      transparent 100%
    ),
    var(--glass-bg);
}

/* Border glow on hover */
.glass-spotlight::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background:
    radial-gradient(
      calc(var(--spotlight-size, 250px) * 0.75) calc(var(--spotlight-size, 250px) * 0.75) at var(--spotlight-x, 0px) var(--spotlight-y, 0px),
      hsla(var(--spotlight-hue, 280), 100%, 60%, 0) 0%,
      transparent 100%
    );
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.glass-spotlight:hover::before {
  opacity: 1;
  background:
    radial-gradient(
      calc(var(--spotlight-size, 250px) * 0.75) calc(var(--spotlight-size, 250px) * 0.75) at var(--spotlight-x, 0px) var(--spotlight-y, 0px),
      hsla(var(--spotlight-hue, 280), 100%, 60%, 0.5) 0%,
      transparent 100%
    );
}
</style>
