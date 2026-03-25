import { ref, computed } from 'vue'
import { useApi } from './useApi'

const api = useApi()

export function useMetadata() {
  const categories = ref([]) // array of { name, types, components, loading }
  const loading = ref(false)
  const searchQuery = ref('')
  const recentOnly = ref(false)

  let debounceTimer = null
  let currentOrgAlias = null

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
    } catch (err) {
      loading.value = false
      console.error('Failed to load metadata:', err)
      throw err
    }
  }

  /**
   * Debounced (300ms) filter across all categories.
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

  return {
    categories,
    filteredCategories,
    loading,
    searchQuery,
    recentOnly,
    loadMetadata,
    search,
    toggleRecentlyModified,
  }
}
