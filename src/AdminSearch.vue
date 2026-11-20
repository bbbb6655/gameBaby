<script setup>
import Icon from './Icon.vue'

defineProps({ placeholder: String, disabled: Boolean })
const value = defineModel({ type: String, required: true })
const emit = defineEmits(['search'])
</script>

<template>
  <form class="row wrap admin-search" @submit.prevent="emit('search')">
    <label class="search">
      <Icon name="Search" :size="17" />
      <input v-model="value" :aria-label="placeholder" :placeholder="placeholder" />
    </label>
    <button class="secondary" :disabled="disabled">搜索</button>
  </form>
</template>
