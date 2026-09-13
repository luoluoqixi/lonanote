import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { EditorRuntimeUpdatePayload } from "./protocol";
import { isEditorRuntimeUpdatePayload } from "./protocol";

function createRuntime(): EditorRuntimeUpdatePayload {
  return {
    revision: 2,
    platform: "ios",
    colorScheme: "dark",
    colors: {
      canvas: "#111111",
      text: "#f5f5f5",
      textMuted: "#a1a1aa",
      accent: "#c4b5fd",
      accentForeground: "#000000",
      caret: "#c4b5fd",
      selection: "#4c3f70",
      selectionInactive: "#27272a",
      gutterText: "#a1a1aa",
      gutterActiveText: "#f5f5f5",
      border: "#3f3f46",
      codeBackground: "#27272a",
      codeText: "#f5f5f5",
      inlineCodeBackground: "#27272a",
      inlineCodeText: "#c4b5fd",
      formatting: "#c4b5fd",
      link: "#c4b5fd",
      quoteBorder: "#c4b5fd",
      highlightBackground: "#665200",
      checkboxBackground: "#111111",
      checkboxBorder: "#c4b5fd",
      checkboxChecked: "#c4b5fd",
      checkboxCheckmark: "#000000",
      scrollbarThumb: "#3f3f46",
      scrollbarThumbActive: "#a1a1aa",
    },
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    contentInsets: { top: 0, right: 0, bottom: 45, left: 0 },
    locale: "zh-CN",
    pixelRatio: 3,
    fontScale: 1,
    reducedMotion: false,
  };
}

describe("Editor runtime 主题颜色校验", () => {
  test("接受完整的语义颜色快照", () => {
    assert.equal(isEditorRuntimeUpdatePayload(createRuntime()), true);
  });

  test("拒绝缺少任意必需颜色的快照", () => {
    const runtime = createRuntime();
    const colors = { ...runtime.colors } as Record<string, string>;
    delete colors.checkboxCheckmark;

    assert.equal(isEditorRuntimeUpdatePayload({ ...runtime, colors }), false);
  });

  test("拒绝空颜色字符串", () => {
    const runtime = createRuntime();

    assert.equal(
      isEditorRuntimeUpdatePayload({
        ...runtime,
        colors: { ...runtime.colors, canvas: "" },
      }),
      false,
    );
  });
});
