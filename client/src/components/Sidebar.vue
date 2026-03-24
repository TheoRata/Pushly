<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  {
    name: 'Orgs',
    path: '/',
    icon: 'globe',
  },
  {
    name: 'Retrieve',
    path: '/retrieve',
    icon: 'download',
  },
  {
    name: 'Deploy',
    path: '/deploy',
    icon: 'upload',
  },
  {
    name: 'History',
    path: '/history',
    icon: 'clock',
  },
]

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside class="flex flex-col w-[200px] bg-[#12121e] border-r border-white/5 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 py-5">
      <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-primary)] font-bold text-white text-sm">
        SF
      </div>
      <span class="text-[var(--text-primary)] font-semibold text-sm tracking-wide">Deploy Kit</span>
    </div>

    <!-- Navigation -->
    <nav class="flex flex-col gap-1 px-3 mt-2 flex-1">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
        :class="isActive(item.path)
          ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'"
      >
        <!-- Globe icon -->
        <svg v-if="item.icon === 'globe'" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.732-3.558" />
        </svg>

        <!-- Download icon -->
        <svg v-if="item.icon === 'download'" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>

        <!-- Upload icon -->
        <svg v-if="item.icon === 'upload'" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>

        <!-- Clock icon -->
        <svg v-if="item.icon === 'clock'" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>

        <span>{{ item.name }}</span>
      </router-link>
    </nav>

    <!-- Bottom section -->
    <div class="px-5 py-4 border-t border-white/5">
      <p class="text-[var(--text-muted)] text-xs">SF Deploy Kit</p>
    </div>
  </aside>
</template>
