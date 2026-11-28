import { beforeEach, expect, mock, test } from "bun:test";

const values = new Map<string, unknown>();
let platform = "windows";
// 只替换宿主持久化边界，偏好默认、归一化、保存/重载及菜单策略运行真实代码。
mock.module("../src/api/commands/store", () => ({
  store: {
    commonGetSync: (key: string) => values.get(key),
    commonSetSync: (key: string, value: unknown) => values.set(key, value),
    commonSave: async () => {},
    commonReloadSync: () => {},
  },
}));
mock.module("../src/api/common", () => ({
  isDesktop: () => ["windows", "linux", "macos"].includes(platform),
  os: () => platform,
}));
mock.module("../src/theme/accent_themes", () => ({
  defaultAccentThemeName: "lavender",
  normalizeAccentThemeName: (value: unknown) => (typeof value === "string" ? value : "lavender"),
}));
const { uiPreferences } = await import("../src/stores/ui/ui_preferences");
const { resolveDesktopContextMenuNative } = await import("../src/api/common/desktop_menu_policy");
const key = "ui.appearance.contextMenuStyle";

beforeEach(() => values.clear());

for (const [osName, style, native] of [
  ["windows", "app", false],
  ["linux", "app", false],
  ["macos", "system", true],
] as const) {
  test(osName + " 未配置时选用平台默认，读取不会写入默认值", () => {
    platform = osName;
    const preferences = uiPreferences.reloadPreferences();
    expect(preferences.appearance.contextMenuStyle).toBe(style);
    expect(
      resolveDesktopContextMenuNative("desktop", platform, preferences.appearance.contextMenuStyle),
    ).toBe(native);
    expect(values.has(key)).toBe(false);
  });

  for (const savedStyle of ["system", "app"] as const) {
    test(osName + " 保留用户显式的 " + savedStyle + "，修改其他设置后仍保持", async () => {
      platform = osName;
      values.set(key, savedStyle);
      const preferences = uiPreferences.getPreferences();
      expect(preferences.appearance.contextMenuStyle).toBe(savedStyle);
      await uiPreferences.savePreferences({
        ...preferences,
        developer: { optionsEnabled: true },
      });
      const loaded = uiPreferences.reloadPreferences();
      expect(loaded.appearance.contextMenuStyle).toBe(savedStyle);
      expect(
        resolveDesktopContextMenuNative("desktop", platform, loaded.appearance.contextMenuStyle),
      ).toBe(savedStyle === "system");
    });
  }
}

test("未知持久化值回退 Windows 应用菜单，移动布局仍由平台决定", async () => {
  platform = "windows";
  values.set(key, "invalid");
  const loaded = uiPreferences.getPreferences();
  expect(loaded.appearance.contextMenuStyle).toBe("app");
  expect(
    resolveDesktopContextMenuNative("mobile", platform, loaded.appearance.contextMenuStyle),
  ).toBeUndefined();
});
