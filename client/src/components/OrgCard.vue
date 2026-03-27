<script setup>
import GlassCard from './glass/GlassCard.vue'
import GlassBadge from './glass/GlassBadge.vue'
import GlassButton from './glass/GlassButton.vue'

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

function typeBadgeVariant(type) {
  if (type === 'production') return 'error'
  if (type === 'developer') return 'success'
  if (type === 'scratch') return 'warning'
  return 'info'
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
  <GlassCard hover padding="md">
    <!-- Header row -->
    <div class="flex items-start justify-between mb-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-[var(--text-primary)] font-semibold text-base truncate">{{ org.alias }}</span>
          <span :class="['w-2 h-2 rounded-full shrink-0', statusColor(org.status)]" />
        </div>
        <p class="text-[var(--text-muted)] text-sm truncate">{{ org.username }}</p>
      </div>
      <GlassBadge :variant="typeBadgeVariant(org.type)" size="md">
        {{ typeLabel(org.type) }}
      </GlassBadge>
    </div>

    <!-- Last used -->
    <p class="text-[var(--text-muted)] text-xs mb-4">
      Last used: {{ formatTime(org.lastUsed) }}
    </p>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <GlassButton variant="ghost" size="sm" @click="$emit('refresh', org.alias)">
        Refresh
      </GlassButton>
      <GlassButton
        v-if="org.status === 'expired'"
        variant="ghost"
        size="sm"
        @click="$emit('reconnect', org.alias)"
      >
        Reconnect
      </GlassButton>
      <GlassButton variant="danger" size="sm" class="ml-auto" @click="$emit('remove', org.alias)">
        Remove
      </GlassButton>
    </div>
  </GlassCard>
</template>
