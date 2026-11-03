import { expect, test } from "bun:test";

import { createEditorTabBlankPressDetector } from "../src/components/editor/desktop/editor_tab_blank_press";

test("空白区域单击不新建，连续双击只触发一次，第三次单击不会重复新建", () => {
  const press = createEditorTabBlankPressDetector();
  expect(press(1000, 20, 10)).toBe(false);
  expect(press(1200, 21, 10)).toBe(true);
  expect(press(1300, 21, 10)).toBe(false);
});

test("间隔过长或点击位置相距较远不能算作双击", () => {
  const press = createEditorTabBlankPressDetector();
  expect(press(1000, 20, 10)).toBe(false);
  expect(press(2000, 20, 10)).toBe(false);
  expect(press(2100, 50, 10)).toBe(false);
  expect(press(2200, 50, 10)).toBe(true);
});
