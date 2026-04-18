<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useOrgs } from '../composables/useOrgs'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassSpotlightCard from '../components/glass/GlassSpotlightCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'
import GlassBadge from '../components/glass/GlassBadge.vue'
import GlassSkeleton from '../components/glass/GlassSkeleton.vue'

const router = useRouter()
const api = useApi()
const { orgs, refresh: loadOrgs } = useOrgs()

const history = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    await loadOrgs()
    const data = await api.get('/history')
    history.value = Array.isArray(data) ? data : data.records || []
  } catch (err) {
    error.value = err.message || 'Failed to load dashboard data'
    console.error('Failed to load dashboard data:', err)
  }
  loading.value = false
})

async function retry() {
  loading.value = true
  error.value = ''
  try {
    await loadOrgs()
    const data = await api.get('/history')
    history.value = Array.isArray(data) ? data : data.records || []
  } catch (err) {
    error.value = err.message || 'Failed to load dashboard data'
  }
  loading.value = false
}

const connectedOrgs = computed(() => orgs.value.filter(o => o.status === 'connected'))

const sevenDaysAgo = computed(() => Date.now() - 7 * 24 * 60 * 60 * 1000)

const recentOps = computed(() => {
  return history.value.filter(h => new Date(h.startedAt).getTime() > sevenDaysAgo.value)
})

const recentDeploys = computed(() => recentOps.value.filter(h => h.type === 'deploy'))
const recentRetrieves = computed(() => recentOps.value.filter(h => h.type === 'retrieve'))

const componentsMoved = computed(() => {
  return recentOps.value.reduce((sum, h) => sum + (h.components?.length || 0), 0)
})

const successRate = computed(() => {
  const deploys = recentDeploys.value
  if (!deploys.length) return null
  const passed = deploys.filter(h => h.status === 'success' || h.status === 'passed').length
  return Math.round((passed / deploys.length) * 100)
})

const recentActivity = computed(() => history.value.slice(0, 8))

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

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const typeConfig = {
  deploy: { icon: 'M12 8l4 4h-2.5v8h-3v-8H8l4-4zM4 4h16v2H4V4z', color: 'var(--color-primary)' },
  retrieve: { icon: 'M12 16l-4-4h2.5V4h3v8H16l-4 4zM4 18h16v2H4v-2z', color: 'var(--color-info)' },
  rollback: { icon: 'M12.5 8c-2.65 0-5.05 1-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z', color: 'var(--color-warning)' },
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-8">

    <!-- Header + Quick Actions -->
    <div class="flex items-start justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style="text-wrap: balance">Dashboard</h1>
        <p class="text-sm text-[var(--text-secondary)] mt-1">Overview of your Salesforce deployment pipeline</p>
      </div>
      <div class="flex gap-2">
        <router-link to="/retrieve">
          <GlassButton variant="secondary" size="sm">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16l-4-4h2.5V4h3v8H16l-4 4zM4 18h16v2H4v-2z" />
            </svg>
            Retrieve
          </GlassButton>
        </router-link>
        <router-link to="/compare">
          <GlassButton variant="secondary" size="sm">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zm10 0h-4a1 1 0 00-1 1v14a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1z" />
            </svg>
            Compare
          </GlassButton>
        </router-link>
        <router-link to="/deploy">
          <GlassButton variant="primary" size="sm">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8l4 4h-2.5v8h-3v-8H8l4-4zM4 4h16v2H4V4z" />
            </svg>
            Deploy
          </GlassButton>
        </router-link>
      </div>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div v-for="n in 4" :key="n" class="glass p-5 space-y-3">
          <GlassSkeleton variant="line" width="60%" height="12px" />
          <GlassSkeleton variant="line" width="40%" height="28px" />
          <GlassSkeleton variant="line" width="80%" height="12px" />
        </div>
      </div>
      <div class="glass p-5 space-y-4">
        <GlassSkeleton variant="line" width="140px" height="18px" />
        <div v-for="n in 5" :key="n" class="flex items-center gap-4 py-3">
          <GlassSkeleton variant="circle" width="32px" height="32px" />
          <div class="flex-1 space-y-2">
            <GlassSkeleton variant="line" width="70%" height="14px" />
            <GlassSkeleton variant="line" width="40%" height="12px" />
          </div>
          <GlassSkeleton variant="line" width="80px" height="12px" />
        </div>
      </div>
    </template>

    <!-- Error state -->
    <div v-else-if="error && !history.length" class="flex items-center justify-center py-20">
      <GlassCard padding="lg" class="max-w-md w-full text-center">
        <svg class="w-8 h-8 text-[var(--color-error)] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p class="text-sm font-medium text-[var(--text-primary)] mb-1">Failed to load dashboard</p>
        <p class="text-sm text-[var(--text-muted)] mb-4">{{ error }}</p>
        <GlassButton variant="primary" size="sm" @click="retry">Try again</GlassButton>
      </GlassCard>
    </div>

    <template v-else>

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        <!-- Connected Orgs -->
        <GlassSpotlightCard glow-color="purple">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Connected Orgs</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ connectedOrgs.length }}</div>
          <div v-if="connectedOrgs.length > 0" class="flex items-center gap-1.5 mt-2 flex-wrap">
            <div
              v-for="org in connectedOrgs"
              :key="org.alias"
              class="flex items-center gap-1 text-xs text-[var(--text-muted)]"
            >
              <div class="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
              {{ org.alias }}
            </div>
          </div>
          <router-link v-else to="/orgs" class="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">Manage orgs &rarr;</router-link>
        </GlassSpotlightCard>

        <!-- Deploys -->
        <GlassSpotlightCard glow-color="blue">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Deploys (7d)</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ recentDeploys.length }}</div>
          <div class="flex items-center gap-2 mt-2">
            <div v-if="successRate !== null" class="flex items-center gap-1">
              <div
                class="w-1.5 h-1.5 rounded-full"
                :class="successRate >= 80 ? 'bg-[var(--color-success)]' : successRate >= 50 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'"
              />
              <span class="text-xs" :class="successRate >= 80 ? 'text-[var(--color-success)]' : successRate >= 50 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'">
                {{ successRate }}% success
              </span>
            </div>
            <router-link v-else to="/history" class="text-xs text-[var(--color-primary)] hover:underline">View history &rarr;</router-link>
          </div>
        </GlassSpotlightCard>

        <!-- Retrieves -->
        <GlassSpotlightCard glow-color="green">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Retrieves (7d)</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ recentRetrieves.length }}</div>
          <router-link to="/retrieve" class="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">New retrieve &rarr;</router-link>
        </GlassSpotlightCard>

        <!-- Components Moved -->
        <GlassSpotlightCard glow-color="orange">
          <div class="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Components (7d)</div>
          <div class="text-3xl font-bold text-[var(--text-primary)]">{{ componentsMoved }}</div>
          <span class="text-xs text-[var(--text-muted)] mt-2 inline-block">Across all operations</span>
        </GlassSpotlightCard>
      </div>

      <!-- Recent Activity -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Recent Activity</h2>
          <router-link v-if="history.length > 8" to="/history" class="text-xs text-[var(--color-primary)] hover:underline">
            View all {{ history.length }} &rarr;
          </router-link>
        </div>

        <GlassCard v-if="recentActivity.length === 0" padding="lg">
          <p class="text-center text-[var(--text-muted)]">No recent activity. Start by connecting an org and running a retrieve.</p>
        </GlassCard>

        <div v-else class="space-y-1.5">
          <GlassCard
            v-for="item in recentActivity"
            :key="item.id"
            hover
            padding="sm"
            class="cursor-pointer"
            @click="router.push('/history')"
          >
            <div class="flex items-center gap-3">
              <!-- Status dot -->
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                :class="
                  item.status === 'success' || item.status === 'passed' ? 'bg-[var(--color-success)]'
                  : item.status === 'failed' || item.status === 'error' ? 'bg-[var(--color-error)]'
                  : 'bg-[var(--color-warning)]'
                "
              />

              <!-- Type icon -->
              <svg class="w-4 h-4 flex-shrink-0" :style="{ color: typeConfig[item.type]?.color || 'var(--text-muted)' }" fill="currentColor" viewBox="0 0 24 24">
                <path :d="typeConfig[item.type]?.icon || typeConfig.deploy.icon" />
              </svg>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <span class="text-sm text-[var(--text-primary)]">{{ item.name || capitalize(item.type) || 'Deploy' }}</span>
                <span class="text-xs text-[var(--text-muted)] ml-2">{{ item.targetOrg || item.sourceOrg || '' }}</span>
              </div>

              <!-- Type badge -->
              <GlassBadge
                :variant="item.type === 'deploy' ? 'info' : item.type === 'retrieve' ? 'success' : 'warning'"
                size="sm"
              >{{ capitalize(item.type) }}</GlassBadge>

              <!-- Component count -->
              <GlassBadge v-if="item.components?.length" variant="purple" size="sm">{{ item.components.length }}</GlassBadge>

              <!-- Time -->
              <span class="text-xs text-[var(--text-muted)] flex-shrink-0 w-16 text-right">{{ timeAgo(item.startedAt) }}</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </template>
  </div>
</template>
