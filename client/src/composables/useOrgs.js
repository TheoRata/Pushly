import { ref } from 'vue'
import { useApi } from './useApi'

const orgs = ref([])
const loading = ref(false)
const api = useApi()

export function useOrgs() {
  async function refresh() {
    loading.value = true
    try {
      const data = await api.get('/orgs')
      orgs.value = data.orgs || data || []
    } catch (err) {
      console.error('[useOrgs] Failed to refresh orgs:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function connectOrg(alias, type, customDomain = '') {
    const data = await api.post('/orgs/connect', { alias, type, customDomain })
    return data
  }

  async function removeOrg(alias) {
    await api.del(`/orgs/${encodeURIComponent(alias)}`)
    orgs.value = orgs.value.filter((o) => o.alias !== alias)
  }

  async function connectOrgAuthUrl(alias, authUrl) {
    return api.post('/orgs/connect/auth-url', { alias, authUrl })
  }

  async function checkHealth(alias) {
    return api.get(`/orgs/${encodeURIComponent(alias)}/health`)
  }

  async function getEnv() {
    return api.get('/orgs/env')
  }

  return { orgs, loading, refresh, connectOrg, connectOrgAuthUrl, removeOrg, checkHealth, getEnv }
}
