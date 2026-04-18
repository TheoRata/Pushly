<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from './composables/useApi'
import { useOrgs } from './composables/useOrgs'
import TopNavBar from './components/TopNavBar.vue'
import ThemeToggle from './components/ThemeToggle.vue'
import PrerequisiteError from './components/PrerequisiteError.vue'
import Toast from './components/Toast.vue'
import GlassBadge from './components/glass/GlassBadge.vue'

const api = useApi()
const { orgs } = useOrgs()
const connectedCount = computed(() => orgs.value.filter((o) => o.status === 'connected').length)

const prereqResult = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    prereqResult.value = await api.get('/prerequisites')
  } catch {
    prereqResult.value = { ok: false, checks: [{ name: 'Server', status: 'fail', message: 'Cannot reach server' }] }
  }
  loading.value = false
})

const allPassed = computed(() => prereqResult.value?.ok || prereqResult.value?.checks?.every((c) => c.status === 'pass'))
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center h-screen">
    <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
  </div>

  <PrerequisiteError
    v-else-if="!allPassed"
    :checks="prereqResult.checks"
    @resolved="prereqResult = $event"
  />

  <div v-else class="min-h-screen">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:rounded-[var(--radius-md)] focus:bg-[var(--color-primary)] focus:text-white"
    >
      Skip to content
    </a>
    <TopNavBar>
      <template #right>
        <div class="flex items-center gap-2">
          <GlassBadge v-if="connectedCount > 0" variant="purple" size="sm">{{ connectedCount }} org{{ connectedCount !== 1 ? 's' : '' }}</GlassBadge>
          <ThemeToggle />
        </div>
      </template>
    </TopNavBar>
    <main id="main-content" class="pt-14">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Toast />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
