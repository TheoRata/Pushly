<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Confirm',
  },
  message: {
    type: String,
    default: 'Are you sure?',
  },
  confirmText: {
    type: String,
    default: 'Confirm',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  dangerous: {
    type: Boolean,
    default: false,
  },
  requireTypedConfirmation: {
    type: Boolean,
    default: false,
  },
  confirmationText: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['confirm', 'cancel'])

const typedValue = ref('')

const canConfirm = computed(() => {
  if (!props.requireTypedConfirmation) return true
  return typedValue.value === props.confirmationText
})

function confirm() {
  if (!canConfirm.value) return
  emit('confirm')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('cancel')" />

      <!-- Modal -->
      <div class="relative w-full max-w-sm mx-4 rounded-xl bg-[var(--bg-surface)] border border-white/10 shadow-2xl">
        <div class="px-6 py-5">
          <h3 class="text-base font-semibold text-[var(--text-primary)] mb-2">{{ title }}</h3>
          <p class="text-sm text-[var(--text-secondary)] leading-relaxed">{{ message }}</p>

          <!-- Typed confirmation -->
          <div v-if="requireTypedConfirmation" class="mt-4">
            <p class="text-xs text-[var(--text-muted)] mb-1.5">
              Type <span class="font-mono text-[var(--text-primary)]">{{ confirmationText }}</span> to confirm
            </p>
            <input
              v-model="typedValue"
              type="text"
              :placeholder="confirmationText"
              class="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-white/10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)]/50 transition-colors"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/5">
          <button
            class="px-4 py-2 text-sm font-medium rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold rounded-md text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            :class="dangerous
              ? 'bg-[var(--color-error)] hover:bg-[var(--color-error)]/80'
              : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80'"
            :disabled="!canConfirm"
            @click="confirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
