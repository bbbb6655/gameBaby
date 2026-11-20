<script setup>
import Icon from './Icon.vue'
defineProps({ items: Array })
</script>

<template>
  <ul v-if="items.length" class="timeline">
    <li v-for="item in items" :key="item.id">
      <span class="list-icon"
        ><Icon
          :name="item.kind === 'event' ? 'ClipboardList' : item.kind === 'milestone' ? 'Sprout' : 'Heart'"
          :size="17"
      /></span>
      <div>
        <strong>{{ item.title }}</strong
        ><small>{{ item.detail }}</small>
      </div>
      <time>{{ item.date }}</time>
    </li>
  </ul>
  <div v-else class="empty"><Icon name="ClipboardList" :size="23" />暂无记录</div>
</template>
