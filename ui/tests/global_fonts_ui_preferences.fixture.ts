import { expect, mock, test } from "bun:test";

const values = new Map<string, unknown>();
const writes: [string, unknown][] = [];
mock.module("../src/api/commands/store", () => ({
  store: {
    commonGetSync: (key: string) => values.get(key),
    commonSetSync: (key: string, value: unknown) => {
      writes.push([key, value]);
      values.set(key, value);
    },
    commonSave: async () => {},
    applyCommonSnapshot: (snapshot: { values: Record<string, unknown> }) => {
      for (const [key, value] of Object.entries(snapshot.values)) values.set(key, value);
    },
  },
}));
mock.module("../src/api/common", () => ({ isDesktop: () => true }));
mock.module("../src/theme/accent_themes", () => ({
  defaultAccentThemeName: "lavender",
  normalizeAccentThemeName: (value: unknown) => (typeof value === "string" ? value : "lavender"),
}));
const { uiPreferences } = await import("../src/stores/ui/ui_preferences");
const font = { platform: "windows" as const, familyKey: "Segoe UI", displayName: "Segoe UI" };

test("UI 字体变化只写自己的全局 key，重置显式写 null", async () => {
  values.clear();
  writes.length = 0;
  const initial = uiPreferences.getPreferences();
  expect(initial.appearance.font).toBeNull();
  await uiPreferences.savePreferences({ ...initial, appearance: { ...initial.appearance, font } });
  expect(writes).toEqual([["ui.appearance.font", font]]);
  writes.length = 0;
  await uiPreferences.savePreferences(initial);
  expect(writes).toEqual([["ui.appearance.font", null]]);
});

test("其他窗口快照更新字体，非法字体不影响其他 UI 设置", () => {
  values.clear();
  writes.length = 0;
  const snapshot = {
    runtimeId: "test",
    revision: 1,
    values: { "ui.appearance.font": font, "ui.appearance.themeMode": "dark" },
  };
  expect(uiPreferences.applyCommonStoreSnapshot(snapshot).appearance.font).toEqual(font);
  const next = uiPreferences.applyCommonStoreSnapshot({
    ...snapshot,
    revision: 2,
    values: { ...snapshot.values, "ui.appearance.font": {} },
  });
  expect(next.appearance.font).toBeNull();
  expect(next.appearance.themeMode).toBe("dark");
  expect(writes).toEqual([]);
});
