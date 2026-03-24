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

      categories.value = categoryList
      loading.value = false

      // Progressively load components per category
      for (const category of categoryList) {
        const allComponents = []

        for (const mt of category.types) {
          const typeName = mt.xmlName || mt
          try {
            const { components } = await api.get(
              `/metadata/${encodeURIComponent(orgAlias)}/components?type=${encodeURIComponent(typeName)}`
            )
            for (const c of components) {
              allComponents.push({
                fullName: c.fullName || c.name || c,
                type: typeName,
                lastModified: c.lastModifiedDate || c.createdDate || null,
                lastModifiedBy: c.lastModifiedByName || null,
              })
            }
          } catch (err) {
            console.warn(`Failed to load components for ${typeName}:`, err)
          }
        }

        category.components = allComponents
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
