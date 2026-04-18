<script setup>
import { useRoute } from 'vue-router'
import SpecialText from './SpecialText.vue'

const route = useRoute()

const navItems = [
  { label: 'Dashboard', to: '/', icon: 'grid' },
  { label: 'Orgs', to: '/orgs', icon: 'globe' },
  { label: 'Retrieve', to: '/retrieve', icon: 'download' },
  { label: 'Compare', to: '/compare', icon: 'columns' },
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
  columns: 'M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z',
}
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 glass border-t-0 border-l-0 border-r-0 rounded-none border-b border-b-[var(--glass-border)]" style="background: var(--nav-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);">
    <router-link to="/" class="flex items-center gap-2 mr-8">
      <div class="w-7 h-7 rounded-[var(--radius-sm)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)] flex items-center justify-center">
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 3c0 0-4 4-4 9l4 4 4-4c0-5-4-9-4-9z"/>
          <path d="M8 14l-2 2M12 14l2 2"/>
        </svg>
      </div>
      <SpecialText text="Pushly" :speed="25" :delay="0.3" class="text-sm font-semibold text-[var(--text-primary)]" />
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
