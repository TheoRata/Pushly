<script setup>
import { ref, onMounted } from 'vue'
import { useApi } from './composables/useApi'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import PrerequisiteError from './components/PrerequisiteError.vue'

const { get } = useApi()

const prereqOk = ref(null) // null = loading, true = passed, false = failed
const prereqChecks = ref([])

onMounted(async () => {
  try {
    const result = await get('/prerequisites')
    if (result.ok) {
      prereqOk.value = true
    } else {
      prereqChecks.value = result.checks
      prereqOk.value = false
    }
  } catch {
    // Server unreachable — show the app anyway (dev mode with separate vite server)
    prereqOk.value = true
  }
})

function handlePrereqResolved(newResult) {
  if (!newResult || newResult.ok !== false) {
    prereqOk.value = true
  } else {
    prereqChecks.value = newResult.checks
  }
}
</script>

<template>
  <!-- Loading state -->
  <div v-if="prereqOk === null" class="flex items-center justify-center h-screen bg-[var(--bg-base)]">
    <div class="flex flex-col items-center gap-3">
      <svg class="w-8 h-8 text-[var(--color-primary)] animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p class="text-sm text-[var(--text-secondary)]">Checking prerequisites...</p>
    </div>
  </div>

  <!-- Prerequisite error -->
  <PrerequisiteError
    v-else-if="prereqOk === false"
    :checks="prereqChecks"
    @resolved="handlePrereqResolved"
  />

  <!-- Main app -->
  <div v-else class="flex h-screen bg-[var(--bg-base)]">
    <Sidebar />
    <main class="flex-1 overflow-auto p-6">
      <router-view />
    </main>
    <Toast />
  </div>
</template>
