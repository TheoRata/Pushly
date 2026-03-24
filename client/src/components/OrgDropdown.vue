<script setup>
import { ref, onMounted } from 'vue'
import { useOrgs } from '../composables/useOrgs'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: 'Select Org',
  },
})

const emit = defineEmits(['update:modelValue'])

const { orgs, refresh } = useOrgs()
const open = ref(false)

onMounted(() => {
  if (orgs.value.length === 0) {
    refresh().catch(() => {})
  }
})

function select(alias) {
  emit('update:modelValue', alias)
  open.value = false
}

function statusColor(status) {
  switch (status) {
    case 'connected': return 'bg-[var(--color-success)]'
    case 'expiring': return 'bg-[var(--color-warning)]'
    case 'expired': return 'bg-[var(--color-error)]'
    default: return 'bg-[var(--text-muted)]'
  }
}

function typeBadgeClass(type) {
  if (type === 'production') return 'bg-[var(--color-error)]/15 text-[var(--color-error)]'
  return 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
}

const selectedOrg = () => orgs.value.find((o) => o.alias === props.modelValue)
</script>

<template>
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
      {{ label }}
    </label>

    <!-- Trigger -->
    <button
      type="button"
      class="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-white/10 text-sm text-[var(--text-primary)] hover:border-white/20 transition-colors cursor-pointer"
      @click="open = !open"
      @blur="setTimeout(() => open = false, 150)"
    >
      <span v-if="selectedOrg()" class="flex items-center gap-2 truncate">
        <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(selectedOrg().status)]" />
        {{ selectedOrg().alias }}
      </span>
      <span v-else class="text-[var(--text-muted)]">{{ label }}</span>

      <!-- Chevron -->
      <svg
        class="w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform"
        :class="open ? 'rotate-180' : ''"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute z-50 mt-1 w-full rounded-lg bg-[var(--bg-elevated)] border border-white/10 shadow-xl overflow-hidden"
      >
        <div v-if="orgs.length === 0" class="px-3 py-3 text-sm text-[var(--text-muted)]">
          No orgs connected
        </div>
        <button
          v-for="org in orgs"
          :key="org.alias"
          type="button"
          class="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer"
          :class="[
            org.status === 'expired'
              ? 'text-[var(--text-muted)] opacity-60'
              : 'text-[var(--text-primary)] hover:bg-white/5',
            org.alias === modelValue ? 'bg-[var(--color-primary)]/10' : ''
          ]"
          @mousedown.prevent="select(org.alias)"
        >
          <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(org.status)]" />
          <span class="truncate flex-1">{{ org.alias }}</span>
          <span v-if="org.status === 'expired'" class="text-xs text-[var(--color-error)]">Reconnect</span>
          <span v-if="org.type === 'production'" :class="['text-[10px] font-medium px-1.5 py-0.5 rounded', typeBadgeClass(org.type)]">PROD</span>
        </button>
      </div>
    </Transition>
  </div>
</template>
