<script setup>
import BundleDropdown from './BundleDropdown.vue'
import GlassButton from '../glass/GlassButton.vue'

defineProps({
  selectedCount: { type: Number, default: 0 },
  selectedComponents: { type: Array, default: () => [] },
  canProceed: { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'next', 'view-selected', 'load-bundle'])
</script>

<template>
  <div
    class="flex items-center justify-between px-4 py-2.5"
    style="background: rgba(255, 255, 255, 0.02); border-top: 1px solid var(--glass-border);"
  >
    <span
      class="text-sm text-[var(--text-muted)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
      @click="emit('back')"
    >← Back</span>

    <div class="flex items-center gap-3">
      <span
        v-if="selectedCount > 0"
        class="text-sm text-[var(--color-primary)] cursor-pointer hover:opacity-80 transition-opacity"
        @click="emit('view-selected')"
      >{{ selectedCount }} selected</span>

      <BundleDropdown
        :selected-count="selectedCount"
        :selected-components="selectedComponents"
        @load-bundle="emit('load-bundle', $event)"
      />

      <GlassButton variant="primary" :disabled="!canProceed" @click="emit('next')">
        Next →
      </GlassButton>
    </div>
  </div>
</template>
