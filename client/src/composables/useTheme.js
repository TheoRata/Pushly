import { ref, watch } from 'vue'

const STORAGE_KEY = 'pushly:theme'
const theme = ref(getInitialTheme())

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(value) {
  document.documentElement.classList.toggle('dark', value === 'dark')
}

applyTheme(theme.value)

watch(theme, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
  applyTheme(value)
})

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(value) {
    if (value === 'light' || value === 'dark') theme.value = value
  }

  return { theme, toggle, setTheme }
}
