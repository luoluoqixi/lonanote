import { expect, test } from "bun:test";

import {
  createTreeScrollCoordinator,
  treeKeyboardIntent,
} from "../src/components/workspaces/workspace_explorer/tree/tree_input_intent";

test("键盘箭头、Enter、修饰键与输入隔离", () => {
  expect(treeKeyboardIntent({ key: "ArrowDown", shiftKey: true })).toEqual({
    type: "moveFocus",
    delta: 1,
  });
  expect(treeKeyboardIntent({ key: " " })).toEqual({ type: "activate" });
  expect(treeKeyboardIntent({ key: "ArrowRight" })).toEqual({ type: "expand" });
  expect(treeKeyboardIntent({ key: "ArrowLeft" })).toEqual({ type: "collapse" });
  expect(treeKeyboardIntent({ key: "Enter" })).toEqual({ type: "activate" });
  expect(treeKeyboardIntent({ key: " ", metaKey: true })).toEqual({
    type: "select",
    selection: "toggle",
  });
  expect(treeKeyboardIntent({ key: "ArrowDown", editable: true })).toBeNull();
});
test("定位等可见序列出现后滚动，最多重试两次，新请求与 epoch 取消旧定位", () => {
  const scrolled: number[] = [];
  const controller = createTreeScrollCoordinator((index) => scrolled.push(index));
  controller.request("A/a.md", 1);
  controller.update(["A"], 1);
  expect(scrolled).toEqual([]);
  controller.update(["A", "A/a.md"], 1);
  expect(scrolled).toEqual([1]);
  controller.retry();
  controller.retry();
  controller.retry();
  expect(scrolled).toEqual([1, 1, 1]);
  controller.request("B", 1);
  controller.update(["B"], 2);
  controller.retry();
  expect(scrolled).toEqual([1, 1, 1]);
  controller.request("A", 2);
  controller.request("B", 2);
  controller.update(["A", "B"], 2);
  expect(scrolled.at(-1)).toBe(1);
});
