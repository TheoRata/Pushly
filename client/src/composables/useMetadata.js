import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { buildSearchIndex, fuzzySearch, matchCountsByCategory } from './useFuzzySearch.js'

const api = useApi()

// Module-level singleton state shared across all useMetadata() consumers.
// cache: Map<orgAlias, { categories, searchIndex, loaded }> — in-memory per
//   session; lost on page reload (the server's SQLite cache covers cold loads).
// inFlight: Map<orgAlias, Promise> — dedupes concurrent loadMetadata() calls
//   for the same org.
// The exposed refs (categories, searchIndex, loading) mirror the entry for
//   currentOrgAlias and are swapped on org switch.
const cache = new Map()
const inFlight = new Map()
const currentOrgAlias = ref(null)
const categories = ref([])
const searchIndex = ref(new Map())
const loading = ref(false)

function buildCategoryList(types) {
  const list = Object.entries(types).map(([name, typeList]) => ({
    name,
    types: typeList,
    components: [],
    loading: true,
    expanded: false,
  }))
  list.sort((a, b) => a.name.localeCompare(b.name))
  return list
}

function collectTypeNames(categoryList) {
  const names = []
  for (const cat of categoryList) {
    for (const mt of cat.types) {
      names.push(mt.xmlName || mt)
    }
  }
  return names
}

function distributeBatchResults(categoryList, results) {
  for (const cat of categoryList) {
    const all = []
    for (const mt of cat.types) {
      const typeName = mt.xmlName || mt
      const components = results[typeName]
      if (Array.isArray(components)) {
        for (const c of components) {
          all.push({
            fullName: c.fullName || c.name || c,
            type: typeName,
            lastModified: c.lastModifiedDate || c.createdDate || null,
            lastModifiedBy: c.lastModifiedByName || null,
          })
        }
      }
    }
    cat.components = all.sort((a, b) => a.fullName.localeCompare(b.fullName))
    cat.loading = false
  }
}

// Publish a cache entry to the exposed refs only if the user is still looking
// at this org (guards against org-switch races).
function publishIfCurrent(orgAlias, entry) {
  if (currentOrgAlias.value !== orgAlias) return
  categories.value = [...entry.categories]
  searchIndex.value = entry.searchIndex
  loading.value = false
}

async function doLoad(orgAlias) {
  try {
    const { types } = await api.get(`/metadata/${encodeURIComponent(orgAlias)}/types`)
    const categoryList = buildCategoryList(types)
    const entry = { categories: categoryList, searchIndex: new Map(), loaded: false }
    cache.set(orgAlias, entry)

    // Surface the skeleton tree so the user sees categories while components load.
    if (currentOrgAlias.value === orgAlias) {
      categories.value = categoryList
    }

    const allTypeNames = collectTypeNames(categoryList)
    const { results } = await api.post(
      `/metadata/${encodeURIComponent(orgAlias)}/batch-components`,
      { types: allTypeNames }
    )

    distributeBatchResults(categoryList, results)
    entry.searchIndex = buildSearchIndex(categoryList)
    entry.loaded = true
    publishIfCurrent(orgAlias, entry)
  } catch (err) {
    cache.delete(orgAlias)
    if (currentOrgAlias.value === orgAlias) {
      loading.value = false
    }
    console.error('Failed to load metadata:', err)
    throw err
  }
}

async function loadMetadata(orgAlias) {
  currentOrgAlias.value = orgAlias

  const cached = cache.get(orgAlias)
  if (cached?.loaded) {
    categories.value = cached.categories
    searchIndex.value = cached.searchIndex
    loading.value = false
    return
  }

  if (inFlight.has(orgAlias)) {
    loading.value = true
    try { await inFlight.get(orgAlias) } catch {}
    return
  }

  loading.value = true
  categories.value = []
  searchIndex.value = new Map()

  const promise = doLoad(orgAlias)
  inFlight.set(orgAlias, promise)
  try {
    await promise
  } finally {
    inFlight.delete(orgAlias)
  }
}

async function refreshAll() {
  const orgAlias = currentOrgAlias.value
  if (!orgAlias) return

  const existing = cache.get(orgAlias)
  if (existing) {
    for (const cat of existing.categories) cat.loading = true
    publishIfCurrent(orgAlias, existing)
  }
  loading.value = true

  try {
    const { types } = await api.post(`/metadata/${encodeURIComponent(orgAlias)}/refresh`)
    const categoryList = buildCategoryList(types)
    const fresh = { categories: categoryList, searchIndex: new Map(), loaded: false }
    cache.set(orgAlias, fresh)
    if (currentOrgAlias.value === orgAlias) {
      categories.value = categoryList
    }

    const allTypeNames = collectTypeNames(categoryList)
    const { results } = await api.post(
      `/metadata/${encodeURIComponent(orgAlias)}/batch-components`,
      { types: allTypeNames, skipCache: true }
    )

    distributeBatchResults(categoryList, results)
    fresh.searchIndex = buildSearchIndex(categoryList)
    fresh.loaded = true
    publishIfCurrent(orgAlias, fresh)
  } catch (err) {
    cache.delete(orgAlias)
    if (currentOrgAlias.value === orgAlias) loading.value = false
    console.error('Failed to refresh metadata:', err)
    throw err
  }
}

async function refreshTypes(typeNames) {
  const orgAlias = currentOrgAlias.value
  if (!orgAlias || !typeNames.length) return
  const unique = [...new Set(typeNames)]

  const entry = cache.get(orgAlias)
  if (!entry) return

  for (const cat of entry.categories) {
    if (cat.types.some(t => unique.includes(t.xmlName || t))) cat.loading = true
  }
  publishIfCurrent(orgAlias, entry)

  try {
    const { results } = await api.post(
      `/metadata/${encodeURIComponent(orgAlias)}/batch-components`,
      { types: unique, skipCache: true }
    )

    for (const cat of entry.categories) {
      const catTypeNames = cat.types.map(t => t.xmlName || t)
      const refreshed = catTypeNames.filter(t => unique.includes(t))
      if (refreshed.length === 0) continue

      const kept = cat.components.filter(c => !refreshed.includes(c.type))
      const added = []
      for (const typeName of refreshed) {
        const components = results[typeName]
        if (Array.isArray(components)) {
          for (const c of components) {
            added.push({
              fullName: c.fullName || c.name || c,
              type: typeName,
              lastModified: c.lastModifiedDate || c.createdDate || null,
              lastModifiedBy: c.lastModifiedByName || null,
            })
          }
        }
      }
      cat.components = [...kept, ...added].sort((a, b) => a.fullName.localeCompare(b.fullName))
      cat.loading = false
    }
    entry.searchIndex = buildSearchIndex(entry.categories)
    publishIfCurrent(orgAlias, entry)
  } catch (err) {
    for (const cat of entry.categories) cat.loading = false
    publishIfCurrent(orgAlias, entry)
    console.error('Failed to refresh metadata types:', err)
    throw err
  }
}

export function useMetadata() {
  // Per-instance UI filter state — each MetadataTree keeps its own.
  const searchQuery = ref('')
  const recentOnly = ref(false)
  const activeCategory = ref(null)
  let debounceTimer = null

  const searchResults = computed(() =>
    fuzzySearch(searchIndex.value, searchQuery.value, activeCategory.value)
  )

  const searchMatchCounts = computed(() => {
    if (!searchQuery.value || !searchQuery.value.trim()) return new Map()
    const allResults = fuzzySearch(searchIndex.value, searchQuery.value, null)
    if (!allResults) return new Map()
    return matchCountsByCategory(allResults)
  })

  const displayedComponents = computed(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    let components
    if (searchResults.value !== null) {
      components = searchResults.value.map(r => r.component)
    } else if (activeCategory.value) {
      const cat = categories.value.find(c => c.name === activeCategory.value)
      components = cat ? cat.components : []
    } else {
      components = categories.value.flatMap(c => c.components)
    }

    if (recentOnly.value) {
      components = components.filter(c => {
        if (!c.lastModified) return false
        return new Date(c.lastModified).getTime() > sevenDaysAgo
      })
    }
    return components
  })

  const filteredCategories = computed(() => {
    const isSearching = searchQuery.value && searchQuery.value.trim()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return categories.value.map((cat) => {
      let components = cat.components
      if (isSearching) {
        const count = searchMatchCounts.value.get(cat.name) ?? 0
        if (count === 0) return null
        const catResults = searchResults.value !== null
          ? searchResults.value.filter(r => r.categoryName === cat.name).map(r => r.component)
          : []
        components = catResults
      }
      if (recentOnly.value) {
        components = components.filter((c) => {
          if (!c.lastModified) return false
          return new Date(c.lastModified).getTime() > sevenDaysAgo
        })
        if (components.length === 0) return null
      }
      return { ...cat, components }
    }).filter(Boolean)
  })

  function search(query) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { searchQuery.value = query }, 150)
  }

  function toggleRecentlyModified() { recentOnly.value = !recentOnly.value }
  function setActiveCategory(categoryName) { activeCategory.value = categoryName }

  return {
    categories,
    filteredCategories,
    displayedComponents,
    loading,
    searchQuery,
    recentOnly,
    activeCategory,
    searchMatchCounts,
    loadMetadata,
    refreshAll,
    refreshTypes,
    search,
    toggleRecentlyModified,
    setActiveCategory,
  }
}
