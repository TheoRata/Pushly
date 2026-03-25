import { ref, computed } from 'vue'
import { useApi } from './useApi'

const api = useApi()

export function useMetadata() {
  const categories = ref([]) // array of { name, types, components, loading }
  const loading = ref(false)
  const searchQuery = ref('')
  const recentOnly = ref(false)

  let debounceTimer = null

  /**
   * Fetches types from GET /api/metadata/:orgAlias/types
   * Then PROGRESSIVELY loads components per type.
   * Categories appear immediately, components load per-category with spinners.
   */
  async function loadMetadata(orgAlias) {
    loading.value = true
    categories.value = []

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

      // Progressively load components per category — all types within a category load in parallel
      for (const category of categoryList) {
        const typePromises = category.types.map(async (mt) => {
          const typeName = mt.xmlName || mt
          try {
            const { components } = await api.get(
              `/metadata/${encodeURIComponent(orgAlias)}/components?type=${encodeURIComponent(typeName)}`
            )
            return (components || []).map((c) => ({
              fullName: c.fullName || c.name || c,
              type: typeName,
              lastModified: c.lastModifiedDate || c.createdDate || null,
              lastModifiedBy: c.lastModifiedByName || null,
            }))
          } catch (err) {
            console.warn(`Failed to load components for ${typeName}:`, err)
            return []
          }
        })

        const results = await Promise.all(typePromises)
        category.components = results.flat().sort((a, b) => a.fullName.localeCompare(b.fullName))
        category.loading = false
        // Trigger reactivity
        categories.value = [...categories.value]
      }
    } catch (err) {
      loading.value = false
      console.error('Failed to load metadata:', err)
      throw err
    }
  }

  /**
   * Debounced (300ms) filter across all categories.
   * Searches friendly name and API name.
   */
  function search(query) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchQuery.value = query
    }, 300)
  }

  /**
   * Filters to only show components modified in last 7 days.
   */
  function toggleRecentlyModified() {
    recentOnly.value = !recentOnly.value
  }

  /**
   * Filtered categories based on search and recent filters.
   */
  const filteredCategories = computed(() => {
    const query = searchQuery.value.toLowerCase()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return categories.value.map((cat) => {
      let components = cat.components

      if (query) {
        components = components.filter(
          (c) =>
            c.fullName.toLowerCase().includes(query) ||
            c.type.toLowerCase().includes(query)
        )
      }

      if (recentOnly.value) {
        components = components.filter((c) => {
          if (!c.lastModified) return false
          return new Date(c.lastModified).getTime() > sevenDaysAgo
        })
      }

      return { ...cat, components }
    }).filter((cat) => {
      // If searching, hide categories with no matching components
      if (query || recentOnly.value) return cat.components.length > 0
      return true
    })
  })

  // Track the orgAlias for lazy loading deferred categories
  let currentOrgAlias = null

  const _origLoadMetadata = loadMetadata
  async function loadMetadataWrapped(orgAlias) {
    currentOrgAlias = orgAlias
    return _origLoadMetadata(orgAlias)
  }

  /**
   * Lazy-load a deferred category (e.g., "Other") when user expands it.
   */
  async function loadDeferredCategory(categoryName) {
    const cat = categories.value.find((c) => c.name === categoryName && c.deferred)
    if (!cat || !currentOrgAlias) return
    cat.loading = true
    cat.deferred = false
    categories.value = [...categories.value]

    const typePromises = cat.types.map(async (mt) => {
      const typeName = mt.xmlName || mt
      try {
        const { components } = await api.get(
          `/metadata/${encodeURIComponent(currentOrgAlias)}/components?type=${encodeURIComponent(typeName)}`
        )
        return (components || []).map((c) => ({
          fullName: c.fullName || c.name || c,
          type: typeName,
          lastModified: c.lastModifiedDate || c.createdDate || null,
          lastModifiedBy: c.lastModifiedByName || null,
        }))
      } catch {
        return []
      }
    })

    const results = await Promise.all(typePromises)
    cat.components = results.flat().sort((a, b) => a.fullName.localeCompare(b.fullName))
    cat.loading = false
    categories.value = [...categories.value]
  }

  return {
    categories,
    filteredCategories,
    loading,
    searchQuery,
    recentOnly,
    loadMetadata: loadMetadataWrapped,
    loadDeferredCategory,
    search,
    toggleRecentlyModified,
  }
}
