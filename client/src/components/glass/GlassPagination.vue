<script setup>
import { computed } from 'vue'
import { usePagination } from '../../composables/usePagination'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  itemsToDisplay: { type: Number, default: 5 },
})

const emit = defineEmits(['update:currentPage'])

const currentPageRef = computed(() => props.currentPage)
const totalPagesRef = computed(() => props.totalPages)

const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
  currentPage: currentPageRef,
  totalPages: totalPagesRef,
  paginationItemsToDisplay: props.itemsToDisplay,
})

function goTo(page) {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page)
  }
}
</script>

<template>
  <nav role="navigation" aria-label="pagination" class="flex w-full justify-center">
    <ul class="flex items-center gap-1">
      <!-- Previous -->
      <li>
        <button
          class="inline-flex items-center gap-1 h-9 px-3 rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-150"
          :class="
            currentPage === 1
              ? 'text-[var(--text-muted)] pointer-events-none opacity-50'
              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
          "
          :disabled="currentPage === 1"
          @click="goTo(currentPage - 1)"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          <span>Previous</span>
        </button>
      </li>

      <!-- Left ellipsis -->
      <li v-if="showLeftEllipsis">
        <span class="flex h-9 w-9 items-center justify-center text-[var(--text-muted)]">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 15 15">
            <path d="M3.625 7.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Zm5 0a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0ZM12.5 8.625a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" />
          </svg>
        </span>
      </li>

      <!-- Page numbers -->
      <li v-for="page in pages" :key="page">
        <button
          class="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-150"
          :class="
            page === currentPage
              ? 'border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
          "
          :aria-current="page === currentPage ? 'page' : undefined"
          @click="goTo(page)"
        >
          {{ page }}
        </button>
      </li>

      <!-- Right ellipsis -->
      <li v-if="showRightEllipsis">
        <span class="flex h-9 w-9 items-center justify-center text-[var(--text-muted)]">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 15 15">
            <path d="M3.625 7.5a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0Zm5 0a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0ZM12.5 8.625a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" />
          </svg>
        </span>
      </li>

      <!-- Next -->
      <li>
        <button
          class="inline-flex items-center gap-1 h-9 px-3 rounded-[var(--radius-sm)] text-sm font-medium transition-colors duration-150"
          :class="
            currentPage === totalPages || totalPages === 0
              ? 'text-[var(--text-muted)] pointer-events-none opacity-50'
              : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
          "
          :disabled="currentPage === totalPages || totalPages === 0"
          @click="goTo(currentPage + 1)"
        >
          <span>Next</span>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </li>
    </ul>
  </nav>
</template>
