<template>
  <header class="app-toolbar">
    <div class="toolbar-section navigation-tools">
      <button class="toolbar-icon-button" type="button" aria-label="后退" :disabled="!navigation.canGoBack" @click="$emit('navigate', 'back')">
        <ArrowLeft />
      </button>
      <button class="toolbar-icon-button" type="button" aria-label="前进" :disabled="!navigation.canGoForward" @click="$emit('navigate', 'forward')">
        <ArrowRight />
      </button>
      <button class="toolbar-icon-button" type="button" aria-label="刷新" @click="$emit('navigate', 'refresh')">
        <RefreshCw />
      </button>
      <button class="toolbar-icon-button" type="button" aria-label="主页" @click="$emit('navigate', 'home')">
        <House />
      </button>
    </div>

    <div class="toolbar-title">
      <span>{{ navigation.title || '竞赛主页' }}</span>
    </div>

    <div class="toolbar-section right-tools">
      <button class="toolbar-icon-button" type="button" aria-label="系统信息" @click="$emit('navigate', 'info')">
        <Info />
      </button>
      <button class="toolbar-icon-button" type="button" aria-label="更新检测" @click="$emit('check-update')">
        <RefreshCcwDot />
      </button>
      <button class="toolbar-icon-button" type="button" aria-label="系统重置" @click="$emit('reset')">
        <Eraser />
      </button>
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
    </div>
  </header>
</template>

<script setup>
import {
  ArrowLeft,
  ArrowRight,
  House,
  Info,
  Maximize2,
  Minus,
  RefreshCcwDot,
  RefreshCw,
  Eraser,
  X
} from 'lucide-vue-next';

defineProps({
  navigation: {
    type: Object,
    required: true
  },
  platform: {
    type: String,
    required: true
  }
});

defineEmits(['navigate', 'check-update', 'reset', 'window-control']);
</script>
