<template>
  <header class="window-titlebar">
    <div class="window-titlebar-title">{{ title }}</div>
    <div v-if="platform !== 'darwin'" class="window-controls" aria-label="窗口控制">
      <button class="window-control-button" type="button" aria-label="最小化" @click="$emit('window-control', 'minimize')">
        <Minus />
      </button>
      <button class="window-control-button" type="button" aria-label="最大化" @click="$emit('window-control', 'maximize')">
        <Maximize2 />
      </button>
      <button class="window-control-button close" type="button" aria-label="关闭" @click="$emit('window-control', 'close')">
        <X />
      </button>
    </div>
  </header>
</template>

<script setup>
import { Maximize2, Minus, X } from 'lucide-vue-next';

defineProps({
  platform: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
});

defineEmits(['window-control']);
</script>
