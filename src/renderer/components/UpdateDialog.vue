<template>
  <section class="utility-panel update-panel">
    <header class="utility-summary">
      <CloudDownload class="summary-icon" />
      <div>
        <h1>检查客户端更新</h1>
        <p>获取最新版本、兼容性修复和安全更新。</p>
      </div>
    </header>

    <div v-if="state.status === 'idle'" class="utility-status">
      <p>当前版本：{{ state.currentVersion || 'dev' }}</p>
      <span>点击检查更新后会连接发布源获取最新版本信息。</span>
    </div>

    <div v-else-if="state.status === 'loading'" class="utility-status centered">
      <LoaderCircle class="loading-icon" />
      <p>正在检查更新...</p>
    </div>

    <div v-else-if="state.status === 'available'" class="utility-status success">
      <p>发现新版本 {{ state.latestVersion }}</p>
      <span>当前版本：{{ state.currentVersion }}</span>
    </div>

    <div v-else-if="state.status === 'latest'" class="utility-status success">
      <p>已是最新版本</p>
      <span>当前版本：{{ state.currentVersion }}</span>
    </div>

    <div v-else-if="state.status === 'skipped'" class="utility-status warning">
      <p>新版本已跳过</p>
      <span>当前版本：{{ state.currentVersion }}，最新版本：{{ state.latestVersion }}</span>
    </div>

    <div v-else class="utility-status error">
      <p>检查更新失败</p>
      <span>{{ state.error }}</span>
    </div>

    <footer class="dialog-actions">
      <el-button @click="$emit('close')">关闭</el-button>
      <el-button v-if="state.status === 'idle'" type="primary" @click="$emit('check')">检查更新</el-button>
      <el-button v-if="state.status === 'available'" type="primary" @click="$emit('download')">立即下载</el-button>
    </footer>
  </section>
</template>

<script setup>
import { CloudDownload, LoaderCircle } from 'lucide-vue-next';

defineProps({
  state: {
    type: Object,
    required: true
  }
});

defineEmits(['check', 'download', 'close']);
</script>
