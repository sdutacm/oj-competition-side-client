<template>
  <section class="utility-panel">
    <header class="utility-summary">
      <Eraser class="summary-icon" />
      <div>
        <h1>重置本机客户端状态</h1>
        <p>清理本地会话和浏览缓存，然后重新加载竞赛主页。</p>
      </div>
    </header>

    <div class="dialog-body">
      <ul class="reset-list">
        <li>退出当前登录状态</li>
        <li>清空本地存储、会话存储和 Cookie</li>
        <li>关闭所有榜单、资料等子窗口</li>
      </ul>

      <p class="reset-note">不会删除线上账号或竞赛数据。</p>
    </div>

    <footer class="dialog-actions">
      <el-button :disabled="loading" @click="$emit('cancel')">取消</el-button>
      <el-button type="danger" :loading="loading" @click="$emit('confirm')">确认重置</el-button>
    </footer>
  </section>
</template>

<script setup>
import { Eraser } from 'lucide-vue-next';

defineProps({
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['cancel', 'confirm']);
</script>
