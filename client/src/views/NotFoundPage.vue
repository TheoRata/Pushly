<script setup>
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
</script>

<template>
  <div class="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] px-6">
    <GlassCard padding="lg" class="text-center max-w-sm">
      <svg class="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <h1 class="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style="text-wrap: balance">Page not found</h1>
      <p class="text-sm text-[var(--text-secondary)] mt-2 mb-6">This page doesn't exist.</p>
      <router-link to="/">
        <GlassButton variant="primary">Back to Dashboard</GlassButton>
      </router-link>
    </GlassCard>
  </div>
</template>
