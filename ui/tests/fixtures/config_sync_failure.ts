import { mock } from "bun:test";
import assert from "node:assert/strict";

mock.module("@/api/common/platform", () => ({ isTauri: () => false }));
mock.module("@/api/invoke", () => ({ isInvokeAvailable: () => true }));
mock.module("@/stores/settings/settings_store", () => ({
  settingsStore: { applySnapshot: () => {} },
}));
mock.module("@/stores/ui/ui_preferences_store", () => ({
  uiPreferencesStore: { applyCommonStoreSnapshot: () => {} },
}));
mock.module("@/api/commands/store", () => ({ store: { commonSnapshot: async () => ({}) } }));
mock.module("@/api/commands/settings", () => ({
  fromSettingsPayload: (value: unknown) => value,
  settings: {
    snapshot: async () => {
      throw new Error("配置快照不可用");
    },
  },
}));
const { initializeConfigSyncController, waitForConfigSyncReady } =
  await import("../../src/api/common/config_sync_controller");

await assert.rejects(initializeConfigSyncController(), /配置快照不可用/);
await assert.rejects(waitForConfigSyncReady(), /配置快照不可用/);
