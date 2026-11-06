import { type SettingsPayload, fromSettingsPayload } from "@/api/commands/settings";
import type { CommonStoreSnapshot } from "@/api/common/common_store_sync";
import { isTauri } from "@/api/common/platform";
import { isInvokeAvailable } from "@/api/invoke";
import { settingsStore } from "@/stores/settings/settings_store";
import { uiPreferencesStore } from "@/stores/ui/ui_preferences_store";

interface WireSettingsSnapshot {
  runtimeId: string;
  revision: number;
  values: SettingsPayload;
}

let resolveReady: () => void;
let rejectReady: (error: unknown) => void;
const initialSyncReady = new Promise<void>((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});
// 启动消费者可能晚于失败到达；仍向消费者保留失败结果。
void initialSyncReady.catch(() => {});
export const waitForConfigSyncReady = () => initialSyncReady;

function applySettingsSnapshot(snapshot: WireSettingsSnapshot): void {
  settingsStore.applySnapshot({
    runtimeId: snapshot.runtimeId,
    revision: snapshot.revision,
    values: fromSettingsPayload(snapshot.values),
  });
}

/** 每个 Tauri WebView 先订阅，再读取权威快照，并在恢复焦点时校验版本。 */
export async function initializeConfigSyncController(): Promise<() => void> {
  try {
    return await initializeController();
  } catch (error) {
    rejectReady(error);
    throw error;
  }
}

async function initializeController(): Promise<() => void> {
  if (!isInvokeAvailable()) {
    resolveReady();
    return () => {};
  }

  let disposed = false;
  let refreshInFlight: Promise<void> | null = null;
  const unlisten = isTauri()
    ? await (async () => {
        const { listen } = await import("@tauri-apps/api/event");
        return Promise.all([
          listen<CommonStoreSnapshot>("lonanote://common-store-changed", (event) => {
            uiPreferencesStore.applyCommonStoreSnapshot(event.payload);
          }),
          listen<WireSettingsSnapshot>("lonanote://global-settings-changed", (event) => {
            applySettingsSnapshot(event.payload);
          }),
        ]);
      })()
    : [];

  const refresh = () => {
    if (disposed || refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = Promise.all([
      import("@/api/commands/store").then(async ({ store }) => {
        const snapshot = await store.commonSnapshot();
        uiPreferencesStore.applyCommonStoreSnapshot(snapshot);
      }),
      import("@/api/commands/settings").then(async ({ settings }) => {
        settingsStore.applySnapshot(await settings.snapshot());
      }),
    ])
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null;
      });
    return refreshInFlight;
  };

  const refreshInBackground = () => {
    void refresh()?.catch((error) => console.error("[config-sync] 刷新配置失败", error));
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      refreshInBackground();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("focus", refreshInBackground);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  // 所有 listener 完成注册之后再拉取快照，避免初始化期间漏掉已提交变更。
  const dispose = () => {
    disposed = true;
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", refreshInBackground);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    unlisten.forEach((dispose) => dispose());
  };
  try {
    await refresh();
    resolveReady();
    return dispose;
  } catch (error) {
    dispose();
    throw error;
  }
}
