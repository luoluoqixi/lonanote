import { expect, test } from "bun:test";

import { createDesktopMenuItems } from "../src/api/common/desktop_menu_items";

test("跨层菜单使用独立 ID，并仅分发可用叶子节点的动作", async () => {
  const selected: string[] = [];
  const { items, actions } = createDesktopMenuItems([
    {
      text: "复制路径",
      onSelect: () => {
        selected.push("parent");
      },
      subMenu: [
        {
          text: "复制路径",
          onSelect: () => {
            selected.push("relative");
          },
        },
        {
          text: "复制路径",
          onSelect: () => {
            selected.push("absolute");
          },
        },
      ],
    },
    {
      text: "",
      separator: true,
      onSelect: () => {
        selected.push("separator");
      },
    },
    {
      text: "禁用",
      disabled: true,
      subMenu: [
        {
          text: "子项",
          onSelect: () => {
            selected.push("disabled");
          },
        },
      ],
    },
    {
      text: "勾选项",
      checked: false,
      onSelect: () => {
        selected.push("check");
      },
    },
  ]);
  const children = items[0].subMenu!;
  expect(children[0].id).not.toBe(children[1].id);
  await actions.get(children[1].id)?.();
  await actions.get(items[0].id)?.();
  await actions.get(items[1].id)?.();
  await actions.get(items[2].subMenu![0].id)?.();
  await actions.get(items[3].id)?.();
  expect(selected).toEqual(["absolute", "check"]);
  expect(items[2].subMenu![0].disabled).toBe(true);
  expect(items[3].checked).toBe(false);
  expect(JSON.stringify(items)).not.toContain("onSelect");
});
