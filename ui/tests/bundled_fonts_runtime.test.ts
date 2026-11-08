import { expect, test } from "bun:test";

import { isResolvedFont } from "../assets/editor/src/bridge/font_types";
import { listBundledFonts, resolveBundledFont } from "../src/fonts/bundled_fonts";
import { fontSelectionKey } from "../src/fonts/font_selection";

test("内置目录不依赖系统枚举，400/700 白名单资源不依赖平台", async () => {
  expect(listBundledFonts()[0].displayName).toBe("Fira Code");
  const font = await resolveBundledFont("fira-code", "editor");
  expect(font.faces.map((f) => f.weight)).toEqual([400, 700]);
  expect(isResolvedFont(font)).toBe(true);
  expect(
    isResolvedFont({
      ...font,
      faces: [{ ...font.faces[0], source: { kind: "bundled", assetId: "../secret" } }],
    }),
  ).toBe(false);
  expect(fontSelectionKey(listBundledFonts()[0].selection)).not.toBe(
    fontSelectionKey({
      source: "system",
      platform: "windows",
      familyKey: "Fira Code",
      displayName: "Fira Code",
    }),
  );
});
