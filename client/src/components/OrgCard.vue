<script setup>
defineProps({
  org: {
    type: Object,
    required: true,
  },
})

defineEmits(['refresh', 'reconnect', 'remove'])

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
  if (type === 'developer') return 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
  if (type === 'scratch') return 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
  return 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
}

function typeLabel(type) {
  switch (type) {
    case 'production': return 'Production'
    case 'sandbox': return 'Sandbox'
    case 'developer': return 'Developer'
    case 'scratch': return 'Scratch'
    default: return type
  }
}

function formatTime(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
</script>

<template>
  <div
    class="rounded-lg p-4 border transition-colors"
    :class="[
      'bg-[var(--bg-surface)] border-white/5',
      org.type === 'production' ? 'border-l-2 border-l-[var(--color-error)]/50' : ''
    ]"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between mb-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[var(--text-primary)] font-semibold text-base truncate">{{ org.alias }}</span>
          <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(org.status)]" />
        </div>
        <p class="text-[var(--text-muted)] text-sm truncate">{{ org.username }}</p>
      </div>
      <span
        :class="['text-xs font-medium px-2 py-0.5 rounded-md shrink-0', typeBadgeClass(org.type)]"
      >
        {{ typeLabel(org.type) }}
      </span>
    </div>

    <!-- Last used -->
    <p class="text-[var(--text-muted)] text-xs mb-3">
      Last used: {{ formatTime(org.lastUsed) }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        class="px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors cursor-pointer"
        @click="$emit('refresh', org.alias)"
      >
        Refresh
      </button>
      <button
        v-if="org.status === 'expired'"
        class="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--color-warning)]/15 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/25 transition-colors cursor-pointer"
        @click="$emit('reconnect', org.alias)"
      >
        Reconnect
      </button>
      <button
        class="px-3 py-1.5 text-xs font-medium rounded-md text-[var(--color-error)]/70 hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-colors ml-auto cursor-pointer"
        @click="$emit('remove', org.alias)"
      >
        Remove
      </button>
    </div>
  </div>
</template>
