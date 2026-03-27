<script setup>
import { ref, computed } from 'vue'
import GlassModal from './glass/GlassModal.vue'
import GlassInput from './glass/GlassInput.vue'
import GlassButton from './glass/GlassButton.vue'

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
  <GlassModal :show="true" :title="title" max-width="400px" @close="emit('cancel')">
    <p class="text-sm text-[var(--text-secondary)] leading-relaxed">{{ message }}</p>

    <!-- Typed confirmation -->
    <div v-if="requireTypedConfirmation" class="mt-4">
      <p class="text-xs text-[var(--text-muted)] mb-2">
        Type <span class="font-mono text-[var(--text-primary)]">{{ confirmationText }}</span> to confirm
      </p>
      <GlassInput
        :model-value="typedValue"
        :placeholder="confirmationText"
        @update:model-value="typedValue = $event"
      />
    </div>

    <template #footer>
      <GlassButton variant="ghost" size="md" @click="emit('cancel')">
        {{ cancelText }}
      </GlassButton>
      <GlassButton
        :variant="dangerous ? 'danger' : 'primary'"
        size="md"
        :disabled="!canConfirm"
        @click="confirm"
      >
        {{ confirmText }}
      </GlassButton>
    </template>
  </GlassModal>
</template>
