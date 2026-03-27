<script setup>
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: '' },
  maxWidth: { type: String, default: '480px' },
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
        <div class="relative glass p-6 w-full" :style="{ maxWidth }">
          <h2 v-if="title" class="text-lg font-semibold text-[var(--text-primary)] mb-4">{{ title }}</h2>
          <slot />
          <div v-if="$slots.footer" class="mt-6 flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .glass,
.modal-leave-active .glass {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .glass {
  transform: scale(0.95);
}
</style>
