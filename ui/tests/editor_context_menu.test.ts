import { expect, test } from "bun:test";

import {
  isEditorContextCommandPayload,
  isEditorContextMenuPayload,
} from "../assets/editor/src/bridge/protocol";
import { executeEditorMenuAction } from "../src/components/editor/desktop/editor_menu_actions";

test("菜单协议拒绝越界选区和无效命令", () => {
  const snapshot = { revision: 3, selectionVersion: 2, from: 1, to: 4 };
  expect(
    isEditorContextMenuPayload({
      ...snapshot,
      x: 10,
      y: 20,
      text: "abc",
      activeMarks: [],
      canUndo: true,
      canRedo: false,
    }),
  ).toBe(true);
  expect(
    isEditorContextMenuPayload({
      ...snapshot,
      from: 5,
      to: 4,
      x: 10,
      y: 20,
      text: "",
      activeMarks: [],
      canUndo: true,
      canRedo: false,
    }),
  ).toBe(false);
  expect(
    isEditorContextCommandPayload({
      snapshot,
      command: { type: "selection.replace", text: "粘贴" },
    }),
  ).toBe(true);
  expect(
    isEditorContextCommandPayload({ snapshot, command: { type: "selection.replace", text: 42 } }),
  ).toBe(false);
});
test("cut 必须复制成功后才删，paste 读取期间目标失效则不执行", async () => {
  let current = true;
  const commands: unknown[] = [];
  const context = {
    text: "原选区",
    isCurrent: () => current,
    execute: async (command: unknown) => {
      commands.push(command);
    },
    clipboard: {
      writeText: async () => {
        throw new Error("写入失败");
      },
      readText: async () => {
        current = false;
        return "迟到粘贴";
      },
    },
  };
  await expect(executeEditorMenuAction("cut", context)).rejects.toThrow("写入失败");
  expect(commands).toEqual([]);
  await executeEditorMenuAction("paste", context);
  expect(commands).toEqual([]);
});
test("只读菜单的复制不触发编辑命令", async () => {
  const copied: string[] = [];
  await executeEditorMenuAction("copy", {
    text: "选区",
    isCurrent: () => true,
    execute: async () => {
      throw new Error("不应修改");
    },
    clipboard: {
      writeText: async (text) => {
        copied.push(text);
      },
      readText: async () => "",
    },
  });
  expect(copied).toEqual(["选区"]);
});

test("菜单快照拒绝伪造的格式状态", () => {
  expect(
    isEditorContextMenuPayload({
      revision: 1,
      selectionVersion: 0,
      from: 0,
      to: 0,
      x: 0,
      y: 0,
      text: "",
      canUndo: false,
      canRedo: false,
      activeMarks: [42],
    }),
  ).toBe(false);
});

test("菜单项保留格式勾选、只读限制，并拒绝失效目标", async () => {
  const { createEditorMenuItems } =
    await import("../src/components/editor/desktop/editor_menu_items");
  let current = true;
  const commands: unknown[] = [];
  const copied: string[] = [];
  const items = createEditorMenuItems({
    payload: {
      revision: 1,
      selectionVersion: 0,
      from: 0,
      to: 2,
      text: "选区",
      x: 0,
      y: 0,
      activeMarks: ["bold"],
      canUndo: true,
      canRedo: false,
    },
    editable: false,
    isCurrent: () => current,
    execute: async (command) => {
      commands.push(command);
    },
    clipboard: {
      readText: async () => "粘贴",
      writeText: async (text) => {
        copied.push(text);
      },
    },
    onError: (error) => {
      throw error;
    },
  });
  const find = (label: string) => items.find((item) => item.textValue === label)!;
  expect(find("文本格式").disabled).toBe(true);
  expect(find("文本格式").subMenu?.find((item) => item.textValue === "加粗")?.selected).toBe(true);
  expect(find("剪切").disabled).toBe(true);
  expect(find("复制").disabled).toBe(false);
  expect(find("全选").disabled).toBe(false);
  expect(find("撤销").disabled).toBe(true);
  expect(find("重做").disabled).toBe(true);
  await find("剪切").onSelect?.();
  expect(commands).toEqual([]);
  await find("复制").onSelect?.();
  expect(copied).toEqual(["选区"]);
  current = false;
  await find("复制").onSelect?.();
  await find("全选").onSelect?.();
  expect(copied).toEqual(["选区"]);
  expect(commands).toEqual([]);
});
