<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useApi } from '../../composables/useApi'

const props = defineProps({
  selectedCount: { type: Number, default: 0 },
  selectedComponents: { type: Array, default: () => [] },
})

const emit = defineEmits(['load-bundle'])

const api = useApi()

const bundles = ref([])
const isOpen = ref(false)
const showSaveInput = ref(false)
const bundleName = ref('')

async function loadBundles() {
  try {
    const { bundles: list } = await api.get('/bundles')
    bundles.value = list || []
  } catch {
    bundles.value = []
  }
}

async function saveBundle() {
  if (!bundleName.value.trim()) return
  try {
    await api.post('/bundles', {
      name: bundleName.value.trim(),
      components: props.selectedComponents,
    })
    bundleName.value = ''
    showSaveInput.value = false
    await loadBundles()
  } catch (err) {
    console.error('Failed to save bundle:', err)
  }
}

function loadBundle(bundle) {
  emit('load-bundle', bundle.components || [])
  isOpen.value = false
}

async function deleteBundle(name) {
  try {
    await api.del(`/bundles/${encodeURIComponent(name)}`)
    await loadBundles()
  } catch (err) {
    console.error('Failed to delete bundle:', err)
  }
}

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) loadBundles()
}

function handleClickOutside(e) {
  if (!e.target.closest('[data-bundle-dropdown]')) {
    isOpen.value = false
    showSaveInput.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div class="relative" data-bundle-dropdown>
    <!-- Trigger button -->
    <button
      class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] transition-colors"
      @click.stop="toggle"
    >
      <!-- Bookmark icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      <span>Bundles</span>
      <!-- Chevron up icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 transition-transform" :class="isOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>

    <!-- Dropdown (opens upward) -->
    <div
      v-if="isOpen"
      class="absolute bottom-full mb-2 right-0 w-56 rounded-xl border border-[var(--glass-border)] z-50"
      style="background: var(--glass-bg); backdrop-filter: var(--glass-blur);"
      @click.stop
    >
      <!-- Save section -->
      <div class="p-2 border-b border-[var(--glass-border)]">
        <div v-if="!showSaveInput" class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-muted)]">Saved bundles</span>
          <button
            class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="selectedCount > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'"
            :disabled="selectedCount === 0"
            :title="selectedCount === 0 ? 'Select components first' : `Save ${selectedCount} components`"
            @click="showSaveInput = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Save
          </button>
        </div>

        <div v-else class="flex items-center gap-1.5">
          <input
            v-model="bundleName"
            type="text"
            placeholder="Bundle name..."
            class="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--color-primary)]"
            autofocus
            @keydown.enter="saveBundle"
            @keydown.esc="showSaveInput = false; bundleName = ''"
          />
          <button
            class="px-2 py-1 text-xs rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!bundleName.trim()"
            @click="saveBundle"
          >
            Save
          </button>
          <button
            class="px-2 py-1 text-xs rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] transition-colors"
            @click="showSaveInput = false; bundleName = ''"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Bundle list -->
      <div class="max-h-48 overflow-y-auto">
        <div
          v-for="bundle in bundles"
          :key="bundle.name"
          class="group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--glass-bg-hover)] transition-colors"
          @click="loadBundle(bundle)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-xs text-[var(--text-primary)] truncate">{{ bundle.name }}</span>
            <span class="text-xs text-[var(--text-muted)] shrink-0">({{ (bundle.components || []).length }})</span>
          </div>
          <button
            class="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--color-error)] hover:opacity-80 transition-all"
            title="Delete bundle"
            @click.stop="deleteBundle(bundle.name)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div v-if="bundles.length === 0" class="px-3 py-3 text-xs text-[var(--text-muted)] text-center">
          No saved bundles
        </div>
      </div>
    </div>
  </div>
</template>
