import { expect, test } from "bun:test";

import type { FontFamilyEntry } from "../src/api/commands/fonts/types";
import { filterFontFamilies } from "../src/components/settings/font_picker_model";

test("两个消费端分别过滤可用字体，搜索和排序稳定", () => {
  const entries: FontFamilyEntry[] = [
    {
      source: "system",
      selection: {source:"system",platform:"android",familyKey:"serif",displayName:"Serif"},
      displayName: "Serif",
      ui: { available: true },
      editor: { available: true },
    },
    {
      source: "system",
      selection: {source:"system",platform:"android",familyKey:"custom",displayName:"Custom"},
      displayName: "Custom",
      ui: { available: true },
      editor: { available: false, reason: "无法加载" },
    },
  ];
  expect(filterFontFamilies(entries, "editor", "").map((entry) => entry.selection.source === "system" ? entry.selection.familyKey : entry.selection.fontId)).toEqual([
    "serif",
  ]);
  expect(filterFontFamilies(entries, "ui", "  CUST ").map((entry) => entry.selection.source === "system" ? entry.selection.familyKey : entry.selection.fontId)).toEqual([
    "custom",
  ]);
  expect(filterFontFamilies(entries, "ui", "").map((entry) => entry.selection.source === "system" ? entry.selection.familyKey : entry.selection.fontId)).toEqual([
    "custom",
    "serif",
  ]);
  expect(filterFontFamilies(entries, "ui", "does not exist")).toEqual([]);
});
