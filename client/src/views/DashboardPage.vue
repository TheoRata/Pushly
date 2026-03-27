<script setup>
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassSpotlightCard from '../components/glass/GlassSpotlightCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'

const api = useApi()
const { orgs, loadOrgs } = useOrgs()

const history = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    await loadOrgs()
    const data = await api.get('/history')
    history.value = Array.isArray(data) ? data : data.records || []
  } catch (err) {
    console.error('Failed to load dashboard data:', err)
  }
  loading.value = false
})

const connectedOrgs = computed(() => orgs.value.filter((o) => o.status === 'connected').length)

const recentDeploys = computed(() => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return history.value.filter((h) => new Date(h.timestamp || h.date).getTime() > sevenDaysAgo)
})

const successRate = computed(() => {
  if (!recentDeploys.value.length) return null
  const passed = recentDeploys.value.filter((h) => h.status === 'success' || h.status === 'passed').length
  return Math.round((passed / recentDeploys.value.length) * 100)
})

const recentActivity = computed(() => history.value.slice(0, 5))

function timeAgo(date) {
  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
      <p class="text-sm text-[var(--text-secondary)] mt-1">Overview of your Salesforce deployment pipeline</p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <GlassSpotlightCard glow-color="purple">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Connected Orgs</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ connectedOrgs }}</div>
          <router-link to="/orgs" class="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">Manage orgs &rarr;</router-link>
        </GlassSpotlightCard>

        <GlassSpotlightCard glow-color="blue">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Deploys (7 days)</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ recentDeploys.length }}</div>
          <router-link to="/history" class="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">View history &rarr;</router-link>
        </GlassSpotlightCard>

        <GlassSpotlightCard glow-color="green">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Success Rate</div>
          <div class="text-3xl font-bold" :class="successRate === null ? 'text-[var(--text-muted)]' : successRate >= 80 ? 'text-[var(--color-success)]' : successRate >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'">
            {{ successRate === null ? '—' : `${successRate}%` }}
          </div>
          <span class="text-xs text-[var(--text-muted)] mt-2 inline-block">Based on last 7 days</span>
        </GlassSpotlightCard>
      </div>

      <div class="flex gap-3 mb-8">
        <router-link to="/retrieve">
          <GlassButton variant="primary">New Retrieve</GlassButton>
        </router-link>
        <router-link to="/deploy">
          <GlassButton variant="secondary">New Deploy</GlassButton>
        </router-link>
      </div>

      <div>
        <h2 class="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Recent Activity</h2>
        <GlassCard v-if="recentActivity.length === 0" padding="lg">
          <p class="text-center text-[var(--text-muted)]">No recent activity. Start by connecting an org and running a retrieve.</p>
        </GlassCard>
        <div v-else class="space-y-2">
          <GlassCard v-for="item in recentActivity" :key="item.id || item.operationId" hover padding="sm">
            <div class="flex items-center gap-3">
              <div
                class="w-2 h-2 rounded-full"
                :class="
                  item.status === 'success' || item.status === 'passed' ? 'bg-[var(--color-success)]'
                  : item.status === 'failed' || item.status === 'error' ? 'bg-[var(--color-error)]'
                  : 'bg-[var(--color-warning)]'
                "
              />
              <div class="flex-1 min-w-0">
                <span class="text-sm text-[var(--text-primary)]">{{ item.name || item.type || 'Deploy' }}</span>
                <span class="text-xs text-[var(--text-muted)] ml-2">{{ item.targetOrg || item.orgAlias || '' }}</span>
              </div>
              <GlassBadge v-if="item.componentCount" variant="purple" size="sm">{{ item.componentCount }} components</GlassBadge>
              <span class="text-xs text-[var(--text-muted)]">{{ timeAgo(item.timestamp || item.date) }}</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </template>
  </div>
</template>
