<template>
  <el-config-provider :size="'default'">
    <div v-if="view === 'shell'" class="client-shell" :class="platformClass">
      <AppToolbar
        :navigation="navigation"
        :platform="platform"
        @navigate="navigate"
        @check-update="openUtilityWindow('update')"
        @reset="openUtilityWindow('reset')"
        @window-control="controlWindow"
      />

      <main class="browser-stage" />
    </div>

    <div v-else class="utility-window" :class="platformClass">
      <WindowTitleBar
        :platform="platform"
        :title="utilityTitle"
        @window-control="controlWindow"
      />

      <main class="utility-content">
        <UpdateDialog
          v-if="view === 'update'"
          :state="updateState"
          @check="checkForUpdates"
          @download="openDownloadPage"
          @close="controlWindow('close')"
        />

        <ResetDialog
          v-if="view === 'reset'"
          :loading="resetLoading"
          @confirm="resetClient"
          @cancel="controlWindow('close')"
        />
      </main>
    </div>
  </el-config-provider>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import AppToolbar from './components/AppToolbar.vue';
import ResetDialog from './components/ResetDialog.vue';
import UpdateDialog from './components/UpdateDialog.vue';
import WindowTitleBar from './components/WindowTitleBar.vue';
import { getClientApi } from './api/client';

const api = getClientApi();

const view = ref(new URLSearchParams(window.location.search).get('view') || 'shell');
const platform = ref('browser');
const resetLoading = ref(false);
const navigation = reactive({
  canGoBack: false,
  canGoForward: false,
  url: '',
  domain: '',
  title: ''
});
const platformClass = computed(() => ({
  'platform-mac': platform.value === 'darwin',
  'platform-frameless': platform.value !== 'darwin'
}));
const updateState = reactive({
  status: 'idle',
  currentVersion: '',
  latestVersion: '',
  error: ''
});
const utilityTitle = computed(() => (view.value === 'reset' ? '确认系统重置' : '检查更新'));

let unsubscribeNavigation = null;
let unsubscribePageTitle = null;
let unsubscribeTheme = null;

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.theme = theme;
}

async function navigate(action) {
  if (action === 'info') {
    await api.navigate('info');
    return;
  }
  await api.navigate(action);
}

async function controlWindow(action) {
  await api.controlWindow(action);
}

async function openUtilityWindow(type) {
  await api.openUtilityWindow(type);
}

async function checkForUpdates() {
  updateState.status = 'loading';
  updateState.error = '';
  const result = await api.checkUpdate();

  updateState.currentVersion = result.currentVersion || '';
  updateState.latestVersion = result.latestVersion || '';

  if (result.error) {
    updateState.status = 'error';
    updateState.error = result.error;
    return;
  }

  if (result.hasUpdate) {
    updateState.status = 'available';
    return;
  }

  updateState.status = result.skipped ? 'skipped' : 'latest';
}

async function openDownloadPage() {
  await api.openDownloadPage();
  await controlWindow('close');
}

async function resetClient() {
  resetLoading.value = true;
  try {
    await api.resetClient();
    await controlWindow('close');
  } finally {
    resetLoading.value = false;
  }
}

onMounted(async () => {
  const initialState = await api.getInitialState();
  platform.value = initialState.platform || 'browser';
  view.value = initialState.view || view.value;
  updateState.currentVersion = initialState.version || updateState.currentVersion;
  navigation.canGoBack = initialState.canGoBack;
  navigation.canGoForward = initialState.canGoForward;
  navigation.title = initialState.title || '';
  applyTheme(initialState.theme);

  unsubscribeNavigation = api.onNavigationState((state) => {
    navigation.canGoBack = state.canGoBack;
    navigation.canGoForward = state.canGoForward;
    navigation.url = state.url;
    navigation.domain = state.domain;
    navigation.title = state.title || '';
  });

  unsubscribePageTitle = api.onPageTitle((title) => {
    navigation.title = title || '';
  });

  unsubscribeTheme = api.onTheme((theme) => {
    applyTheme(theme);
  });
});

onBeforeUnmount(() => {
  unsubscribeNavigation?.();
  unsubscribePageTitle?.();
  unsubscribeTheme?.();
});
</script>
