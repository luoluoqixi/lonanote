import { expect, test } from "bun:test";

import {
  fontSelectionIdentity,
  fontSelectionKey,
  normalizeFontSelection,
} from "../src/fonts/font_selection";

test("旧本机字体兼容读取，内置字体有跨平台独立身份", () => {
  const old = { platform: "windows", familyKey: "Fira Code", displayName: "Fira Code" };
  expect(normalizeFontSelection(old)).toEqual({ source: "system", ...old });
  expect(normalizeFontSelection({ source: "bundled", fontId: "fira-code" })).toEqual({
    source: "bundled",
    fontId: "fira-code",
  });
  expect(normalizeFontSelection({ source: "bundled", fontId: "../../x" })).toBeNull();
  expect(normalizeFontSelection({ source: "invalid", ...old })).toBeNull();
  expect(fontSelectionKey(normalizeFontSelection(old))).not.toBe(
    fontSelectionKey({ source: "bundled", fontId: "fira-code" }),
  );
  expect(fontSelectionKey(null)).toBe("default");
  expect(fontSelectionIdentity({ source: "bundled", fontId: "fira-code" })).toEqual({
    source: "bundled",
    fontId: "fira-code",
  });
});
