<script setup>
import Icon from './Icon.vue'
import { metrics } from './model.js'
defineProps({ baby: Object, compact: Boolean })

const careMetrics = metrics.filter(([key]) => key !== 'growth')
</script>

<template>
  <div class="state-grid" :class="{ 'state-grid-compact': compact }">
    <div v-for="[key, label, icon, tone] in compact ? careMetrics : metrics" :key="key" class="state-card" :class="tone">
      <span class="state-icon"><Icon :name="icon" :size="18" /></span>
      <span class="state-name">{{ label }}</span>
      <strong>{{ baby.state[key] }}<small>%</small></strong>
      <span class="level-track"><span :style="{ width: `${baby.state[key]}%` }"></span></span>
    </div>
  </div>
</template>
