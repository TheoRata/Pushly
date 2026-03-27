import { computed } from 'vue'

export function usePagination({ currentPage, totalPages, paginationItemsToDisplay = 5 }) {
  const showLeftEllipsis = computed(
    () => currentPage.value - 1 > paginationItemsToDisplay / 2
  )

  const showRightEllipsis = computed(
    () => totalPages.value - currentPage.value + 1 > paginationItemsToDisplay / 2
  )

  const pages = computed(() => {
    const total = totalPages.value
    if (total <= paginationItemsToDisplay) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }

    const halfDisplay = Math.floor(paginationItemsToDisplay / 2)
    let start = currentPage.value - halfDisplay
    let end = currentPage.value + halfDisplay

    start = Math.max(1, start)
    end = Math.min(total, end)

    if (start === 1) end = paginationItemsToDisplay
    if (end === total) start = total - paginationItemsToDisplay + 1

    if (showLeftEllipsis.value) start++
    if (showRightEllipsis.value) end--

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  })

  return { pages, showLeftEllipsis, showRightEllipsis }
}
