import assert from "node:assert/strict";
import { test } from "node:test";

import { isResolvedFont } from "../bridge/font_types";
import { createFontPresentation, fontFamilyStack } from "./font_presentation";

test("字体加载代次、失败与默认清理，不操作文档状态", async () => {
  const applied: (string | null)[] = [];
  const pending = new Map<string, () => void>();
  const controller = createFontPresentation({
    load: (font) => new Promise((resolve) => pending.set(font.family, resolve)),
    apply: (family) => applied.push(family),
    measure: () => applied.push("measure"),
  });
  const a = controller.applyFont({ family: "A", faces: [] });
  const b = controller.applyFont({ family: "B", faces: [] });
  pending.get("B")!();
  await b;
  pending.get("A")!();
  await a;
  assert.deepEqual(applied, ["B", "measure"]);
  await controller.applyFont(null);
  assert.deepEqual(applied.slice(-2), [null, "measure"]);
  controller.dispose();
});

test("字体协议拒绝任意文件及脚本地址", () => {
  assert.equal(isResolvedFont({ family: "Example", faces: [] }), true);
  for (const url of [
    "file:///secret",
    "javascript:alert(1)",
    "https://example.com/font",
    "data:font/ttf;base64,AA",
  ]) {
    assert.equal(
      isResolvedFont({
        family: "Example",
        faces: [{ family: "Example", weight: 400, italic: false, source: { kind: "url", url } }],
      }),
      false,
    );
  }
});

test("Android 系统通用字体族保留 CSS keyword 语义，普通字体名安全引用", () => {
  assert.ok(fontFamilyStack("serif").startsWith("serif,"));
  assert.ok(fontFamilyStack("monospace").startsWith("monospace,"));
  assert.ok(fontFamilyStack("Example Font").startsWith('"Example Font",'));
});

test("A 已应用，B 在途时回到 A 必须取消迟到的 B", async () => {
  const applied: (string | null)[] = [];
  let finishB!: () => void;
  const controller = createFontPresentation({
    load: (font) =>
      font.family === "B"
        ? new Promise((resolve) => {
            finishB = resolve;
          })
        : Promise.resolve(),
    apply: (family) => applied.push(family),
    measure: () => {},
  });
  await controller.applyFont({ family: "A", faces: [] });
  const pending = controller.applyFont({ family: "B", faces: [] });
  await controller.applyFont({ family: "A", faces: [] });
  finishB();
  await pending;
  assert.equal(applied.at(-1), "A");
});
