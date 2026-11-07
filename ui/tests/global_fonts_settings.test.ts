import { describe, expect, test } from "bun:test";

import {
  createDefaultGlobalSettings,
  diffSettings,
  fromSettingsPayload,
  toSettingsPayload,
} from "../src/api/commands/settings/settings_model";
import { fontSelectionIdentity, normalizeFontSelection } from "../src/fonts/font_selection";

const font = { platform: "windows" as const, familyKey: "Segoe UI", displayName: "Segoe UI" };

test("原生桥只发送三个字符串身份字段，不发送目录能力对象", () => {
  const entry = { ...font, ui: { available: true }, editor: { available: true } };
  expect(fontSelectionIdentity(entry)).toEqual(font);
  expect(
    Object.values(fontSelectionIdentity(entry)).every((value) => typeof value === "string"),
  ).toBe(true);
});

describe("全局字体设置", () => {
  test("旧配置和非法身份回退系统默认", () => {
    for (const value of [
      undefined,
      null,
      {},
      { ...font, platform: "unknown" },
      { ...font, familyKey: "" },
    ]) {
      expect(normalizeFontSelection(value)).toBeNull();
    }
    expect(normalizeFontSelection(font)).toEqual(font);
    expect(fromSettingsPayload({}).editorDefaults.font).toBeNull();
  });
  test("编辑器字体只提交一个全局字段且可显式清除", () => {
    const initial = createDefaultGlobalSettings();
    const next = { ...initial, editorDefaults: { ...initial.editorDefaults, font } };
    expect(diffSettings(initial, next)).toEqual({ editorFont: font });
    expect(toSettingsPayload(next).editorFont).toEqual(font);
    expect(diffSettings(next, initial)).toEqual({ editorFont: null });
    expect(diffSettings(next, fromSettingsPayload(toSettingsPayload(next)))).toEqual({});
  });
});
