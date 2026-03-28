import { ref, computed } from 'vue'
import { useApi } from './useApi'

const api = useApi()

const sourceOrg = ref('')
const targetOrg = ref('')
const results = ref(null)
const summary = ref(null)
const loading = ref(false)
const error = ref('')
const filter = ref('changes')
const selectedComponents = ref(new Set())
const expandedKey = ref(null)
const detailLoading = ref(false)
const detailData = ref(null)
const detailError = ref('')

async function compare(source, target) {
  loading.value = true
  error.value = ''
  results.value = null
  summary.value = null
  selectedComponents.value = new Set()
  expandedKey.value = null
  detailData.value = null

  try {
    const data = await api.get(`/compare/inventory?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`)
    results.value = data.diff
    summary.value = data.summary
  } catch (err) {
    error.value = err.message || 'Comparison failed'
  } finally {
    loading.value = false
  }
}

async function fetchDetail(type, name) {
  const key = `${type}:${name}`
  if (expandedKey.value === key) {
    expandedKey.value = null
    detailData.value = null
    return
  }

  expandedKey.value = key
  detailLoading.value = true
  detailError.value = ''
  detailData.value = null

  try {
    const data = await api.get(
      `/compare/detail?source=${encodeURIComponent(sourceOrg.value)}&target=${encodeURIComponent(targetOrg.value)}&type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`
    )
    detailData.value = data
  } catch (err) {
    detailError.value = err.message || 'Failed to fetch details'
  } finally {
    detailLoading.value = false
  }
}

function toggleSelect(type, fullName) {
  const key = `${type}:${fullName}`
  const next = new Set(selectedComponents.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  selectedComponents.value = next
}

function selectAll(components) {
  const next = new Set(selectedComponents.value)
  for (const c of components) {
    next.add(`${c.type}:${c.fullName}`)
  }
  selectedComponents.value = next
}

function clearSelection() {
  selectedComponents.value = new Set()
}

const filteredResults = computed(() => {
  if (!results.value) return []
  const { new: newItems, modified, deleted, unchanged } = results.value
  switch (filter.value) {
    case 'new': return newItems
    case 'modified': return modified
    case 'deleted': return deleted
    case 'changes': return [...newItems, ...modified, ...deleted]
    case 'all': return [...newItems, ...modified, ...deleted, ...unchanged]
    default: return [...newItems, ...modified, ...deleted]
  }
})

const selectedComponentsQuery = computed(() => {
  return [...selectedComponents.value].join(',')
})

export function useCompare() {
  return {
    sourceOrg, targetOrg, results, summary, loading, error, filter,
    selectedComponents, expandedKey, detailLoading, detailData, detailError,
    compare, fetchDetail, toggleSelect, selectAll, clearSelection,
    filteredResults, selectedComponentsQuery,
  }
}
