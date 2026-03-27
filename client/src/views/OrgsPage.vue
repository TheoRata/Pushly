<script setup>
import { ref, onMounted } from 'vue'
import { useOrgs } from '../composables/useOrgs'
import { useApi } from '../composables/useApi'
import OrgCard from '../components/OrgCard.vue'
import ConnectOrgModal from '../components/ConnectOrgModal.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import GlassCard from '../components/glass/GlassCard.vue'
import GlassButton from '../components/glass/GlassButton.vue'

const { orgs, loading, refresh, removeOrg } = useOrgs()
const api = useApi()

const showConnectModal = ref(false)
const showRemoveConfirm = ref(false)
const removeTarget = ref(null)

onMounted(() => {
  refresh().catch(() => {})
})

function openConnect() {
  showConnectModal.value = true
}

async function onConnected() {
  showConnectModal.value = false
  await refresh().catch(() => {})
}

async function handleRefresh(alias) {
  try {
    await api.post(`/orgs/${encodeURIComponent(alias)}/refresh`)
    await refresh()
  } catch (err) {
    console.error('Failed to refresh org:', err)
  }
}

function handleReconnect(alias) {
  // Reconnect uses the same flow as refresh for expired orgs
  handleRefresh(alias)
}

function confirmRemove(alias) {
  removeTarget.value = alias
  showRemoveConfirm.value = true
}

async function executeRemove() {
  if (!removeTarget.value) return
  try {
    await removeOrg(removeTarget.value)
  } catch (err) {
    console.error('Failed to remove org:', err)
  } finally {
    showRemoveConfirm.value = false
    removeTarget.value = null
  }
}

function cancelRemove() {
  showRemoveConfirm.value = false
  removeTarget.value = null
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <!-- Loading state -->
    <div v-if="loading && orgs.length === 0" class="flex items-center justify-center py-32">
      <svg class="w-8 h-8 text-[var(--color-primary)] animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>

    <!-- Empty state -->
    <div v-else-if="orgs.length === 0" class="flex items-center justify-center py-16">
      <GlassCard padding="lg" class="max-w-md w-full text-center">
        <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-end)] mx-auto mb-6 shadow-lg shadow-[var(--color-primary-glow)]">
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-[var(--text-primary)] mb-3">Welcome to Pushly</h1>
        <p class="text-[var(--text-secondary)] text-sm leading-relaxed mb-8">
          To get started, connect your first Salesforce org.<br />
          You'll log in through Salesforce — we never see your password.
        </p>
        <GlassButton variant="primary" size="lg" @click="openConnect">
          Connect a Salesforce Org
        </GlassButton>
      </GlassCard>
    </div>

    <!-- Connected orgs -->
    <template v-else>
      <!-- Page header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">Connected Orgs</h1>
        <GlassButton variant="primary" size="md" @click="openConnect">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Connect Org
        </GlassButton>
      </div>

      <!-- Prompt for second org -->
      <GlassCard v-if="orgs.length === 1" padding="sm" class="mb-6">
        <p class="text-sm text-[var(--text-secondary)]">
          To move metadata between orgs, you'll need at least two connected.
          <button
            class="text-[var(--color-primary)] font-medium hover:underline ml-1 cursor-pointer"
            @click="openConnect"
          >
            Connect another?
          </button>
        </p>
      </GlassCard>

      <!-- Org grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <OrgCard
          v-for="org in orgs"
          :key="org.alias"
          :org="org"
          @refresh="handleRefresh"
          @reconnect="handleReconnect"
          @remove="confirmRemove"
        />
      </div>
    </template>

    <!-- Connect modal -->
    <ConnectOrgModal
      v-if="showConnectModal"
      @connected="onConnected"
      @close="showConnectModal = false"
    />

    <!-- Remove confirm modal -->
    <ConfirmModal
      v-if="showRemoveConfirm"
      title="Remove Org"
      :message="`Are you sure you want to remove '${removeTarget}'? You can reconnect it later.`"
      confirm-text="Remove"
      :dangerous="true"
      @confirm="executeRemove"
      @cancel="cancelRemove"
    />
  </div>
</template>
