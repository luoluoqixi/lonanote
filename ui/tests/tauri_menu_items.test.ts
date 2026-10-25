import { expect, test } from "bun:test";

import { createTauriMenuOptions, editorPredefinedItem } from "../src/api/common/tauri_menu_items";

test("编辑器剪贴板使用预定义项，禁用项保留不可执行状态", () => {
  expect(editorPredefinedItem("cut")).toBe("Cut");
  expect(editorPredefinedItem("copy")).toBe("Copy");
  expect(editorPredefinedItem("paste")).toBe("Paste");
  expect(editorPredefinedItem("复制路径")).toBeUndefined();
  const entries = createTauriMenuOptions(
    [
      { text: "复制", predefined: "Copy" },
      { text: "剪切", predefined: "Cut", disabled: true },
      { text: "加粗", checked: true },
      { text: "", separator: true },
    ],
    () => true,
  );
  expect(entries[0]).toEqual({ item: "Copy", text: "复制" });
  expect(entries[1]).toMatchObject({ enabled: false, text: "剪切" });
  expect(entries[1]).not.toHaveProperty("item");
  expect(entries[2]).toMatchObject({ checked: true });
  expect(entries[3]).toEqual({ item: "Separator" });
});
test("自定义业务命令只执行仍有效的菜单操作", async () => {
  let current = true;
  let called = 0;
  const entries = createTauriMenuOptions(
    [
      {
        text: "命令",
        onSelect: () => {
          called++;
        },
      },
    ],
    () => current,
  );
  await entries[0].action();
  expect(called).toBe(1);
  current = false;
  await entries[0].action();
  expect(called).toBe(1);
});
