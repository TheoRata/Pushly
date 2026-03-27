<script setup>
import { ref, computed, watch, onMounted, onUnmounted, provide, nextTick } from 'vue'

const props = defineProps({
  items: { type: Array, required: true }, // [{ label, key }]
  modelValue: { type: Set, default: () => new Set() },
})

const emit = defineEmits(['update:modelValue'])

const containerRef = ref(null)
const itemElements = ref(new Map())
const itemRects = ref([])
const activeIndex = ref(null)
const focusedIndex = ref(null)
const rafId = ref(null)

// Register/unregister item elements
function registerItem(index, el) {
  if (el) itemElements.value.set(index, el)
  else itemElements.value.delete(index)
}

provide('checkboxGroup', {
  registerItem,
  activeIndex,
})

// Measure item positions relative to container
function measureItems() {
  const container = containerRef.value
  if (!container) return
  const containerRect = container.getBoundingClientRect()
  const rects = []
  itemElements.value.forEach((el, index) => {
    const rect = el.getBoundingClientRect()
    rects[index] = {
      top: rect.top - containerRect.top + container.scrollTop - container.clientTop,
      left: rect.left - containerRect.left + container.scrollLeft - container.clientLeft,
      width: rect.width,
      height: rect.height,
    }
  })
  itemRects.value = rects
}

watch(() => props.items, () => nextTick(measureItems), { deep: true })
onMounted(() => nextTick(measureItems))

// Mouse proximity tracking
function onMouseMove(e) {
  if (rafId.value !== null) cancelAnimationFrame(rafId.value)
  const mouseY = e.clientY
  rafId.value = requestAnimationFrame(() => {
    rafId.value = null
    const container = containerRef.value
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    let closestIndex = null
    let closestDistance = Infinity
    let containingIndex = null
    const rects = itemRects.value

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i]
      if (!r) continue
      const itemStart = containerRect.top + container.clientTop + r.top - container.scrollTop
      const itemEnd = itemStart + r.height
      if (mouseY >= itemStart && mouseY <= itemEnd) containingIndex = i
      const itemCenter = itemStart + r.height / 2
      const distance = Math.abs(mouseY - itemCenter)
      if (distance < closestDistance) { closestDistance = distance; closestIndex = i }
    }
    activeIndex.value = containingIndex ?? closestIndex
  })
}

function onMouseLeave() {
  if (rafId.value !== null) { cancelAnimationFrame(rafId.value); rafId.value = null }
  activeIndex.value = null
}

onUnmounted(() => { if (rafId.value !== null) cancelAnimationFrame(rafId.value) })

// Keyboard navigation
function onKeydown(e) {
  const checkboxes = containerRef.value?.querySelectorAll('[role="checkbox"]')
  if (!checkboxes) return
  const items = Array.from(checkboxes)
  const currentIdx = items.indexOf(e.target)
  if (currentIdx === -1) return

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault()
    const next = e.key === 'ArrowDown'
      ? (currentIdx + 1) % items.length
      : (currentIdx - 1 + items.length) % items.length
    items[next].focus()
  } else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus() }
  else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus() }
}

function onFocus(e) {
  const indexAttr = e.target.closest('[data-proximity-index]')?.getAttribute('data-proximity-index')
  if (indexAttr != null) {
    const idx = Number(indexAttr)
    activeIndex.value = idx
    focusedIndex.value = e.target.matches(':focus-visible') ? idx : null
  }
}

function onBlur(e) {
  if (containerRef.value?.contains(e.relatedTarget)) return
  focusedIndex.value = null
  activeIndex.value = null
}

// Toggle checked state
function toggle(index) {
  const next = new Set(props.modelValue)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  emit('update:modelValue', next)
}

// Compute contiguous checked groups for merged backgrounds
const checkedGroups = computed(() => {
  const sorted = [...props.modelValue].sort((a, b) => a - b)
  const runs = []
  for (const idx of sorted) {
    const last = runs[runs.length - 1]
    if (last && idx === last.end + 1) last.end = idx
    else runs.push({ start: idx, end: idx })
  }
  return runs
})

// Hover highlight rect
const activeRect = computed(() =>
  activeIndex.value !== null ? itemRects.value[activeIndex.value] : null
)

// Focus ring rect
const focusRect = computed(() =>
  focusedIndex.value !== null ? itemRects.value[focusedIndex.value] : null
)

// Dim checked backgrounds when hovering an unchecked item
const isHoveringOther = computed(() =>
  activeIndex.value !== null && !props.modelValue.has(activeIndex.value)
)
</script>

<template>
  <div
    ref="containerRef"
    role="group"
    class="relative flex flex-col gap-0.5 w-72 max-w-full select-none"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
    @focus.capture="onFocus"
    @blur.capture="onBlur"
    @keydown="onKeydown"
  >
    <!-- Merged checked backgrounds -->
    <div
      v-for="(group, gi) in checkedGroups"
      :key="'g-' + gi"
      class="absolute rounded-[20px] pointer-events-none transition-all duration-150 ease-out"
      :class="isHoveringOther ? 'opacity-80' : 'opacity-100'"
      :style="{
        background: 'var(--glass-bg-active)',
        top: itemRects[group.start] ? itemRects[group.start].top + 'px' : '0',
        left: itemRects[group.start] ? itemRects[group.start].left + 'px' : '0',
        width: itemRects[group.end] ? Math.max(itemRects[group.start]?.width || 0, itemRects[group.end]?.width || 0) + 'px' : '0',
        height: itemRects[group.end] ? (itemRects[group.end].top + itemRects[group.end].height - itemRects[group.start].top) + 'px' : '0',
      }"
    />

    <!-- Hover highlight -->
    <Transition
      enter-active-class="transition-opacity duration-75"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-75"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activeRect"
        class="absolute rounded-[20px] pointer-events-none transition-[top,left,width,height] duration-75 ease-out"
        :style="{
          background: 'var(--glass-bg-hover)',
          top: activeRect.top + 'px',
          left: activeRect.left + 'px',
          width: activeRect.width + 'px',
          height: activeRect.height + 'px',
        }"
      />
    </Transition>

    <!-- Focus ring -->
    <div
      v-if="focusRect"
      class="absolute rounded-[20px] pointer-events-none z-20 border border-[var(--color-primary)] transition-all duration-75 ease-out"
      :style="{
        top: (focusRect.top - 2) + 'px',
        left: (focusRect.left - 2) + 'px',
        width: (focusRect.width + 4) + 'px',
        height: (focusRect.height + 4) + 'px',
      }"
    />

    <!-- Items -->
    <GlassCheckboxItem
      v-for="(item, i) in items"
      :key="item.key || item.label"
      :label="item.label"
      :index="i"
      :checked="modelValue.has(i)"
      @toggle="toggle(i)"
    />
  </div>
</template>

<script>
import GlassCheckboxItem from './GlassCheckboxItem.vue'

export default {
  components: { GlassCheckboxItem },
}
</script>
