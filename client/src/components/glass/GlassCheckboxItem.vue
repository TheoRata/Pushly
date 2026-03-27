<script setup>
import { ref, inject, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  index: { type: Number, required: true },
  checked: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

const itemRef = ref(null)
const { registerItem, activeIndex } = inject('checkboxGroup')

onMounted(() => registerItem(props.index, itemRef.value))
onUnmounted(() => registerItem(props.index, null))

// Animated checkmark via stroke-dashoffset
const checkRef = ref(null)
const pathLength = 30 // approximate length of the check path

function onClick() {
  emit('toggle')
}

function onKeydown(e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    emit('toggle')
  }
}
</script>

<template>
  <div
    ref="itemRef"
    :data-proximity-index="index"
    tabindex="0"
    role="checkbox"
    :aria-checked="checked"
    :aria-label="label"
    class="relative z-10 flex items-center gap-2.5 rounded-[20px] px-3 py-2 cursor-pointer outline-none"
    @click="onClick"
    @keydown="onKeydown"
  >
    <!-- Checkbox box -->
    <span
      class="relative w-[18px] h-[18px] shrink-0 flex items-center justify-center"
      @click.stop="$emit('toggle')"
    >
      <span
        class="absolute inset-0 rounded-[5px] border-solid transition-all duration-100"
        :class="
          checked
            ? 'border-[1.5px] border-[var(--color-primary)]'
            : activeIndex === index
              ? 'border-[1.5px] border-[var(--text-secondary)]'
              : 'border-[1.5px] border-[var(--glass-border-hover)]'
        "
      />
      <!-- Animated checkmark -->
      <Transition
        enter-active-class="check-enter"
        leave-active-class="check-leave"
      >
        <svg
          v-if="checked"
          ref="checkRef"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="absolute inset-0 text-[var(--text-primary)] check-svg"
        >
          <path d="M6 12L10 16L18 8" />
        </svg>
      </Transition>
    </span>

    <!-- Label with font weight transition -->
    <span class="inline-grid text-[13px]">
      <!-- Hidden bold copy for stable width -->
      <span
        class="col-start-1 row-start-1 invisible font-semibold"
        aria-hidden="true"
      >{{ label }}</span>
      <!-- Visible label -->
      <span
        class="col-start-1 row-start-1 transition-all duration-100"
        :class="checked || activeIndex === index ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'"
        :style="{ fontWeight: checked ? 600 : 400 }"
      >{{ label }}</span>
    </span>
  </div>
</template>

<style scoped>
.check-svg path {
  stroke-dasharray: 30;
  stroke-dashoffset: 0;
}

.check-enter .check-svg path,
.check-enter path {
  animation: check-draw 0.12s ease-out forwards;
}

.check-leave .check-svg path,
.check-leave path {
  animation: check-undraw 0.08s ease-in forwards;
}

@keyframes check-draw {
  from { stroke-dashoffset: 30; }
  to { stroke-dashoffset: 0; }
}

@keyframes check-undraw {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: 30; }
}
</style>
