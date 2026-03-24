import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

function addToast(type, message) {
  const id = ++nextId
  toasts.value.push({ id, type, message })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

export function useToast() {
  function success(message) {
    addToast('success', message)
  }
  function error(message) {
    addToast('error', message)
  }
  return { success, error, toasts }
}
