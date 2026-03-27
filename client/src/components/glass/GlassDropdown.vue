<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: 'Select...' },
  label: { type: String, default: '' },
})

defineEmits(['update:modelValue'])

const open = ref(false)
const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

function close() {
  open.value = false
}
</script>

<template>
  <div class="relative" @blur.capture="close">
    <label v-if="label" class="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{{ label }}</label>
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-[var(--radius-md)] glass glass-hover transition-all duration-200"
      :class="open && 'border-[var(--color-primary-border)] glow-sm'"
      @click="open = !open"
    >
      <span :class="selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'">
        {{ selected?.label || placeholder }}
      </span>
      <svg class="w-4 h-4 text-[var(--text-muted)] transition-transform" :class="open && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <Transition name="dropdown">
      <div v-if="open" class="absolute z-40 mt-1 w-full glass p-1 max-h-60 overflow-y-auto">
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-all duration-150"
          :class="[
            opt.value === modelValue
              ? 'bg-[var(--color-primary-bg)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)]',
            opt.disabled && 'opacity-40 cursor-not-allowed',
          ]"
          :disabled="opt.disabled"
          @click="!opt.disabled && ($emit('update:modelValue', opt.value), close())"
        >
          <span v-if="opt.icon" class="text-base">{{ opt.icon }}</span>
          <span class="flex-1 text-left">{{ opt.label }}</span>
          <span v-if="opt.badge" class="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--glass-bg-hover)] text-[var(--text-muted)]">{{ opt.badge }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
