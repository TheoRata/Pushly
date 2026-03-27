<script setup>
defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  expandable: { type: Boolean, default: false },
})

defineEmits(['row-click'])

import { ref } from 'vue'
const expandedRow = ref(null)

function toggleRow(index) {
  expandedRow.value = expandedRow.value === index ? null : index
}
</script>

<template>
  <div class="glass overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-[var(--glass-border)]">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-4 py-3 text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider text-left"
            :style="col.width ? { width: col.width } : {}"
            :class="col.align === 'right' && 'text-right'"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in rows" :key="index">
          <tr
            class="border-b border-[var(--glass-border)] last:border-0 transition-colors duration-150 hover:bg-[var(--glass-bg-hover)]"
            :class="expandable && 'cursor-pointer'"
            @click="expandable ? toggleRow(index) : $emit('row-click', row, index)"
          >
            <td v-for="col in columns" :key="col.key" class="px-4 py-3" :class="col.align === 'right' && 'text-right'">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="expandable && expandedRow === index">
            <td :colspan="columns.length" class="px-4 py-4 bg-[var(--glass-bg)]">
              <slot name="expanded" :row="row" :index="index" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
