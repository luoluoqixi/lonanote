import { expect, test } from "bun:test";

import { getEditorTabScrollTarget } from "../src/components/editor/desktop/editor_tab_scroll";

test("从末尾切回首个标签时向左显示首项", () => {
  expect(getEditorTabScrollTarget({ x: 0, width: 112 }, 640, 320)).toBe(0);
});

test("布局尚未得到可视宽度时不向右滚动", () => {
  expect(getEditorTabScrollTarget({ x: 0, width: 112 }, 0, 0)).toBeNull();
});

test("标签大于可视区域时优先显示文件名开头", () => {
  expect(getEditorTabScrollTarget({ x: 0, width: 220 }, 0, 100)).toBeNull();
  expect(getEditorTabScrollTarget({ x: 112, width: 220 }, 0, 100)).toBe(112);
});

test("可见标签不滚动，右侧隐藏标签仅滚动必要距离", () => {
  expect(getEditorTabScrollTarget({ x: 112, width: 112 }, 80, 320)).toBeNull();
  expect(getEditorTabScrollTarget({ x: 448, width: 112 }, 80, 320)).toBe(240);
});
