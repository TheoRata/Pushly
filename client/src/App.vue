<script setup>
import Sidebar from './components/Sidebar.vue'
</script>

<template>
  <div class="flex h-screen bg-[var(--bg-base)]">
    <Sidebar />
    <main class="flex-1 overflow-auto p-6">
      <router-view />
    </main>
  </div>
</template>
