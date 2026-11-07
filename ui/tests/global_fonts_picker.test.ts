import { expect, test } from "bun:test";

import type { FontFamilyEntry } from "../src/api/commands/fonts/types";
import { filterFontFamilies } from "../src/components/settings/font_picker_model";

test("两个消费端分别过滤可用字体，搜索和排序稳定", () => {
  const entries: FontFamilyEntry[] = [
    {
      platform: "android",
      familyKey: "serif",
      displayName: "Serif",
      ui: { available: true },
      editor: { available: true },
    },
    {
      platform: "android",
      familyKey: "custom",
      displayName: "Custom",
      ui: { available: true },
      editor: { available: false, reason: "无法加载" },
    },
  ];
  expect(filterFontFamilies(entries, "editor", "").map((entry) => entry.familyKey)).toEqual([
    "serif",
  ]);
  expect(filterFontFamilies(entries, "ui", "  CUST ").map((entry) => entry.familyKey)).toEqual([
    "custom",
  ]);
  expect(filterFontFamilies(entries, "ui", "").map((entry) => entry.familyKey)).toEqual([
    "custom",
    "serif",
  ]);
  expect(filterFontFamilies(entries, "ui", "does not exist")).toEqual([]);
});
