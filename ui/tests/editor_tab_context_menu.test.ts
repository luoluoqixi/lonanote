import { expect, test } from "bun:test";

import { toEditorTabContextMenuItems } from "../src/components/editor/desktop/editor_tab_menu_items";

test("标签页动作转换为 ContextMenu 标签、禁用状态和分隔线，并拦截失效菜单", async () => {
  const calls: string[] = [];
  let current = true;
  const items = toEditorTabContextMenuItems(
    [
      { action: "close", text: "关闭", enabled: true },
      { action: "copyPath", text: "复制路径", enabled: false, separatorBefore: true },
    ],
    () => current,
    async (action) => {
      calls.push(action);
    },
    () => {},
  );
  expect(items.map((item) => [item.value, item.label, item.disabled, item.separator])).toEqual([
    ["close", "关闭", false, undefined],
    ["separator-copyPath", undefined, undefined, true],
    ["copyPath", "复制路径", true, undefined],
  ]);
  items[0].onSelect?.();
  items[2].onSelect?.();
  await Promise.resolve();
  expect(calls).toEqual(["close"]);
  current = false;
  items[0].onSelect?.();
  expect(calls).toEqual(["close"]);
});

test("菜单动作失败通过现有错误提示处理", async () => {
  const errors: unknown[] = [];
  const error = new Error("关闭失败");
  const items = toEditorTabContextMenuItems(
    [{ action: "close", text: "关闭", enabled: true }],
    () => true,
    async () => {
      throw error;
    },
    (value) => {
      errors.push(value);
    },
  );
  items[0].onSelect?.();
  await Promise.resolve();
  expect(errors).toEqual([error]);
});
