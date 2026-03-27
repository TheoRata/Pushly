<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'grid' },
  { label: 'Orgs', to: '/orgs', icon: 'globe' },
  { label: 'Retrieve', to: '/retrieve', icon: 'download' },
  { label: 'Deploy', to: '/deploy', icon: 'upload' },
  { label: 'History', to: '/history', icon: 'clock' },
]

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const icons = {
  grid: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z',
  globe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
  download: 'M12 16l-4-4h2.5V4h3v8H16l-4 4zM4 18h16v2H4v-2z',
  upload: 'M12 8l4 4h-2.5v8h-3v-8H8l4-4zM4 4h16v2H4V4z',
  clock: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z',
}
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 glass border-t-0 border-l-0 border-r-0 rounded-none border-b border-b-[var(--glass-border)]" style="backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);">
    <router-link to="/" class="flex items-center gap-2 mr-8">
      <div class="w-7 h-7 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)] flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-3.14 1.346 2.14.916a1 1 0 00.788 0l7-3a1 1 0 000-1.84l-7-3z" />
          <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
        </svg>
      </div>
      <span class="text-sm font-semibold text-[var(--text-primary)]">Pushly</span>
    </router-link>

    <div class="flex-1 flex justify-center">
      <div class="inline-flex p-1 gap-0.5 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.02)]">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all duration-200"
          :class="
            isActive(item.to)
              ? 'bg-[var(--color-primary-bg)] border border-[var(--color-primary-border)] text-[var(--text-primary)] glow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          "
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path :d="icons[item.icon]" />
          </svg>
          {{ item.label }}
        </router-link>
      </div>
    </div>

    <div class="w-[140px] flex justify-end">
      <slot name="right" />
    </div>
  </nav>
</template>
