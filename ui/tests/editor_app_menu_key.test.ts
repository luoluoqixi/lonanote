import { expect, test } from "bun:test";
import { Window } from "happy-dom";

import {
  installEditorAppMenuKeys,
  isEditorAppMenuKey,
} from "../assets/editor/src/bridge/app_menu_key";

test("iframe 转发 Alt 按下和释放及助记键，拦截菜单键而保留普通编辑快捷键", () => {
  const win = new Window();
  const sent: unknown[] = [];
  const cleanup = installEditorAppMenuKeys(
    win as unknown as Window,
    () => "windows",
    (payload) => sent.push(payload),
  );
  const key = (type: string, key: string, options = {}) => {
    const event = new win.KeyboardEvent(type, { key, cancelable: true, ...options });
    win.dispatchEvent(event);
    return event.defaultPrevented;
  };
  expect(key("keydown", "Alt")).toBe(true);
  expect(key("keyup", "Alt")).toBe(true);
  expect(key("keydown", "f", { altKey: true })).toBe(true);
  expect(sent).toHaveLength(3);
  expect(sent.every(isEditorAppMenuKey)).toBe(true);
  expect(key("keydown", "c", { ctrlKey: true })).toBe(false);
  expect(key("keydown", "f", { altKey: true, ctrlKey: true })).toBe(false);
  expect(key("keydown", "+", { ctrlKey: true })).toBe(true);
  expect(key("keydown", "-", { ctrlKey: true })).toBe(true);
  expect(key("keydown", "0", { ctrlKey: true })).toBe(true);
  expect(key("keydown", "F11")).toBe(true);
  expect(sent.slice(-4).map((event) => (event as { key: string }).key)).toEqual([
    "+",
    "-",
    "0",
    "F11",
  ]);
  cleanup();
});

test("macOS 和移动端不转发；事件校验拒绝伪造数据", () => {
  const win = new Window();
  const sent: unknown[] = [];
  const cleanup = installEditorAppMenuKeys(
    win as unknown as Window,
    () => "macos",
    (payload) => sent.push(payload),
  );
  win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Alt" }));
  expect(sent).toHaveLength(0);
  expect(isEditorAppMenuKey({ type: "keydown", key: "f" })).toBe(false);
  cleanup();
});
