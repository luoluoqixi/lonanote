import { mock } from "bun:test";
import assert from "node:assert/strict";

const scenario = process.argv[2];
const browserWindow = new EventTarget();
const browserDocument = Object.assign(new EventTarget(), { visibilityState: "visible" });
const globals = globalThis as Record<string, unknown>;
delete globals.window;
delete globals.document;
if (scenario === "web") {
  globals.window = browserWindow;
  globals.document = browserDocument;
} else if (scenario !== "headless") {
  // 复现 RN 存在 window、但不提供 DOM 事件 API 的环境。
  globals.window = {};
  if (scenario === "native-document") {
    globals.window = browserWindow;
    globals.document = {};
  }
}

let commonReads = 0;
let settingsReads = 0;
let appliedCommon: unknown;
let appliedSettings: unknown;
mock.module("@/api/common/platform", () => ({ isTauri: () => false }));
mock.module("@/api/invoke", () => ({ isInvokeAvailable: () => true }));
mock.module("@/stores/settings/settings_store", () => ({
  settingsStore: {
    applySnapshot: (snapshot: unknown) => {
      appliedSettings = snapshot;
    },
  },
}));
mock.module("@/stores/ui/ui_preferences_store", () => ({
  uiPreferencesStore: {
    applyCommonStoreSnapshot: (snapshot: unknown) => {
      appliedCommon = snapshot;
    },
  },
}));
mock.module("@/api/commands/store", () => ({
  store: {
    commonSnapshot: async () => ({
      runtimeId: "test",
      revision: ++commonReads,
      values: { theme: "dark" },
    }),
  },
}));
mock.module("@/api/commands/settings", () => ({
  fromSettingsPayload: (value: unknown) => value,
  settings: {
    snapshot: async () => ({
      runtimeId: "test",
      revision: ++settingsReads,
      values: { autoSave: true },
    }),
  },
}));

const { initializeConfigSyncController, waitForConfigSyncReady } =
  await import("../../src/api/common/config_sync_controller");
const dispose = await initializeConfigSyncController();
await waitForConfigSyncReady();
assert.deepEqual(appliedCommon, { runtimeId: "test", revision: 1, values: { theme: "dark" } });
assert.deepEqual(appliedSettings, { runtimeId: "test", revision: 1, values: { autoSave: true } });

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
if (scenario === "web") {
  browserWindow.dispatchEvent(new Event("focus"));
  await settle();
  assert.deepEqual(appliedCommon, { runtimeId: "test", revision: 2, values: { theme: "dark" } });
  assert.deepEqual(appliedSettings, { runtimeId: "test", revision: 2, values: { autoSave: true } });
  browserDocument.visibilityState = "hidden";
  browserDocument.dispatchEvent(new Event("visibilitychange"));
  await settle();
  assert.equal(commonReads, 2);
  browserDocument.visibilityState = "visible";
  browserDocument.dispatchEvent(new Event("visibilitychange"));
  await settle();
  assert.deepEqual(appliedCommon, { runtimeId: "test", revision: 3, values: { theme: "dark" } });
  assert.deepEqual(appliedSettings, { runtimeId: "test", revision: 3, values: { autoSave: true } });
}
dispose();
const readsAfterDispose = { commonReads, settingsReads };
browserWindow.dispatchEvent(new Event("focus"));
browserDocument.dispatchEvent(new Event("visibilitychange"));
await settle();
assert.deepEqual({ commonReads, settingsReads }, readsAfterDispose);
