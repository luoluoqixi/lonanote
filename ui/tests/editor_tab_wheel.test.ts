import { expect, test } from "bun:test";

import {
  getEditorTabScrollFromThumb,
  getEditorTabScrollbar,
  getEditorTabWheelDelta,
} from "../src/components/editor/desktop/editor_tab_scroll";

test("拖动滑块按轨道比例滚动并限制在内容边界", () => {
  expect(getEditorTabScrollFromThumb(300, 900, 100)).toBe(300);
  expect(getEditorTabScrollFromThumb(300, 900, -10)).toBe(0);
  expect(getEditorTabScrollFromThumb(300, 900, 400)).toBe(600);
  expect(getEditorTabScrollFromThumb(300, 9000, 276)).toBe(8700);
  expect(getEditorTabScrollFromThumb(20, 9000, 10)).toBe(0);
  expect(getEditorTabScrollFromThumb(300, 100, 10)).toBe(0);
});

test("纵向滚轮转成横向位移，触控板使用主轴且不叠加两个方向", () => {
  expect(
    getEditorTabWheelDelta({ deltaX: 0, deltaY: 100, deltaMode: 0, ctrlKey: false }, 300),
  ).toBe(100);
  expect(
    getEditorTabWheelDelta({ deltaX: -80, deltaY: 20, deltaMode: 0, ctrlKey: false }, 300),
  ).toBe(-80);
});

test("按行和按页滚轮换算为像素，Ctrl 缩放不接管", () => {
  expect(getEditorTabWheelDelta({ deltaX: 0, deltaY: -3, deltaMode: 1, ctrlKey: false }, 300)).toBe(
    -48,
  );
  expect(getEditorTabWheelDelta({ deltaX: 0, deltaY: 1, deltaMode: 2, ctrlKey: false }, 300)).toBe(
    300,
  );
  expect(getEditorTabWheelDelta({ deltaX: 0, deltaY: 100, deltaMode: 0, ctrlKey: true }, 300)).toBe(
    0,
  );
});

test("标签没有溢出或尚未布局时不显示滚动条", () => {
  expect(getEditorTabScrollbar(300, 300, 0)).toBeNull();
  expect(getEditorTabScrollbar(0, 600, 0)).toBeNull();
});

test("滚动条按内容比例移动，两端与可视区域对齐", () => {
  expect(getEditorTabScrollbar(300, 900, 0)).toEqual({ width: 100, left: 0 });
  expect(getEditorTabScrollbar(300, 900, 300)).toEqual({ width: 100, left: 100 });
  expect(getEditorTabScrollbar(300, 900, 900)).toEqual({ width: 100, left: 200 });
  expect(getEditorTabScrollbar(300, 900, -10)).toEqual({ width: 100, left: 0 });
});

test("大量标签时滑块仍可辨认，极窄区域也不会越界", () => {
  expect(getEditorTabScrollbar(300, 9000, 8700)).toEqual({ width: 24, left: 276 });
  expect(getEditorTabScrollbar(20, 9000, 8980)).toEqual({ width: 20, left: 0 });
});
