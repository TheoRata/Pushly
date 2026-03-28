import { ref, computed } from 'vue'
import { useApi } from './useApi'
import { buildSearchIndex, fuzzySearch, matchCountsByCategory } from './useFuzzySearch.js'

const api = useApi()

export function useMetadata() {
  const categories = ref([]) // array of { name, types, components, loading }
  const loading = ref(false)
  const searchQuery = ref('')
  const recentOnly = ref(false)
  const activeCategory = ref(null)

  let debounceTimer = null
  let currentOrgAlias = null
  let searchIndex = new Map()

  function rebuildIndex() {
    searchIndex = buildSearchIndex(categories.value)
  }

  /**
   * Fetches types from GET /api/metadata/:orgAlias/types
   * Then loads ALL categories in parallel using the batch endpoint.
   */
  async function loadMetadata(orgAlias) {
    loading.value = true
    categories.value = []
    currentOrgAlias = orgAlias

    try {
      const { types } = await api.get(`/metadata/${encodeURIComponent(orgAlias)}/types`)

      // Build category list immediately (with empty components)
      const categoryList = Object.entries(types).map(([name, typeList]) => ({
        name,
        types: typeList,
        components: [],
        loading: true,
        expanded: false,
      }))
      categoryList.sort((a, b) => a.name.localeCompare(b.name))
      categories.value = categoryList
      loading.value = false

      // Collect ALL type names across all categories for a single batch request
      const allTypeNames = []
      const typeToCategory = new Map()
      for (const cat of categoryList) {
        for (const mt of cat.types) {
          const typeName = mt.xmlName || mt
          allTypeNames.push(typeName)
          if (!typeToCategory.has(typeName)) {
            typeToCategory.set(typeName, [])
          }
          typeToCategory.get(typeName).push(cat.name)
        }
      }

      // Single batch request for all types (server handles concurrency internally)
      const { results } = await api.post(
        `/metadata/${encodeURIComponent(orgAlias)}/batch-components`,
        { types: allTypeNames }
      )

      // Distribute results back to categories
      for (const cat of categoryList) {
        const allComponents = []
        for (const mt of cat.types) {
          const typeName = mt.xmlName || mt
          const components = results[typeName]
          if (Array.isArray(components)) {
            for (const c of components) {
              allComponents.push({
                fullName: c.fullName || c.name || c,
                type: typeName,
                lastModified: c.lastModifiedDate || c.createdDate || null,
                lastModifiedBy: c.lastModifiedByName || null,
              })
            }
          }
        }
        cat.components = allComponents.sort((a, b) => a.fullName.localeCompare(b.fullName))
        cat.loading = false
      }
      // Trigger reactivity
      categories.value = [...categories.value]
      rebuildIndex()
    } catch (err) {
      loading.value = false
      console.error('Failed to load metadata:', err)
      throw err
    }
  }

  /**
   * Debounced (150ms) filter across all categories.
   */
  function search(query) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchQuery.value = query
    }, 150)
  }

  /**
   * Filters to only show components modified in last 7 days.
   */
  function toggleRecentlyModified() {
    recentOnly.value = !recentOnly.value
  }

  /**
   * Sets the active category for filtering.
   */
  function setActiveCategory(categoryName) {
    activeCategory.value = categoryName
  }

  /**
   * Fuzzy search results for the current query and active category.
   * Returns null when no search is active.
   */
  const searchResults = computed(() => {
    return fuzzySearch(searchIndex, searchQuery.value, activeCategory.value)
  })

  /**
   * Match counts per category across ALL categories (ignores activeCategory filter).
   * Returns empty Map when not searching.
   */
  const searchMatchCounts = computed(() => {
    if (!searchQuery.value || !searchQuery.value.trim()) return new Map()
    const allResults = fuzzySearch(searchIndex, searchQuery.value, null)
    if (!allResults) return new Map()
    return matchCountsByCategory(allResults)
  })

  /**
   * The primary list of components to display.
   * - Search active: fuzzy results (filtered by activeCategory)
   * - No search + category selected: that category's components
   * - No search + no category: all components across all categories
   * Then applies recentOnly filter if active.
   */
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

  /**
   * Filtered categories based on search and recent filters.
   * Uses searchMatchCounts for efficiency when searching.
   */
  const filteredCategories = computed(() => {
    const isSearching = searchQuery.value && searchQuery.value.trim()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return categories.value.map((cat) => {
      let components = cat.components

      if (isSearching) {
        const count = searchMatchCounts.value.get(cat.name) ?? 0
        if (count === 0) return null
        // Use fuzzy results for this category
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

  /**
   * Reload ALL metadata fresh from Salesforce (clears server cache first).
   */
  async function refreshAll() {
    if (!currentOrgAlias) return
    const orgAlias = currentOrgAlias

    // Mark all categories as loading
    for (const cat of categories.value) { cat.loading = true }
    categories.value = [...categories.value]

    try {
      // Clear cache and re-fetch types from SF
      const { types } = await api.post(`/metadata/${encodeURIComponent(orgAlias)}/refresh`)

      // Rebuild category list
      const categoryList = Object.entries(types).map(([name, typeList]) => ({
        name,
        types: typeList,
        components: [],
        loading: true,
        expanded: false,
      }))
      categoryList.sort((a, b) => a.name.localeCompare(b.name))
      categories.value = categoryList

      // Collect all type names
      const allTypeNames = []
      for (const cat of categoryList) {
        for (const mt of cat.types) {
          allTypeNames.push(mt.xmlName || mt)
        }
      }

      // Fetch components fresh (skip cache since we just cleared it)
      const { results } = await api.post(
        `/metadata/${encodeURIComponent(orgAlias)}/batch-components`,
        { types: allTypeNames, skipCache: true }
      )

      // Distribute results
      for (const cat of categoryList) {
        const allComponents = []
        for (const mt of cat.types) {
          const typeName = mt.xmlName || mt
          const components = results[typeName]
          if (Array.isArray(components)) {
            for (const c of components) {
              allComponents.push({
                fullName: c.fullName || c.name || c,
                type: typeName,
                lastModified: c.lastModifiedDate || c.createdDate || null,
                lastModifiedBy: c.lastModifiedByName || null,
              })
            }
          }
        }
        cat.components = allComponents.sort((a, b) => a.fullName.localeCompare(b.fullName))
        cat.loading = false
      }
      categories.value = [...categories.value]
      rebuildIndex()
    } catch (err) {
      for (const cat of categories.value) { cat.loading = false }
      categories.value = [...categories.value]
      console.error('Failed to refresh metadata:', err)
      throw err
    }
  }

  /**
   * Reload metadata fresh from SF only for specific types (bypasses cache).
   */
  async function refreshTypes(typeNames) {
    if (!currentOrgAlias || !typeNames.length) return
    const unique = [...new Set(typeNames)]

    // Mark affected categories as loading
    for (const cat of categories.value) {
      if (cat.types.some(t => unique.includes(t.xmlName || t))) {
        cat.loading = true
      }
    }
    categories.value = [...categories.value]

    try {
      const { results } = await api.post(
        `/metadata/${encodeURIComponent(currentOrgAlias)}/batch-components`,
        { types: unique, skipCache: true }
      )

      for (const cat of categories.value) {
        const catTypeNames = cat.types.map(t => t.xmlName || t)
        const refreshed = catTypeNames.filter(t => unique.includes(t))
        if (refreshed.length === 0) continue

        // Replace components for refreshed types, keep others
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
      categories.value = [...categories.value]
      rebuildIndex()
    } catch (err) {
      for (const cat of categories.value) { cat.loading = false }
      categories.value = [...categories.value]
      console.error('Failed to refresh metadata types:', err)
      throw err
    }
  }

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
