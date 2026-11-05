import { expect, test } from "bun:test";

import { reloadAppWindow } from "../src/components/app_menu/app_window_reload";

test("刷新 Web 窗口时仅调用浏览器 reload", () => {
  const calls: string[] = [];

  reloadAppWindow(false, () => calls.push("web"), () => calls.push("native"));

  expect(calls).toEqual(["web"]);
});

test("刷新 Native 窗口时仅调用开发菜单 reload", () => {
  const calls: string[] = [];

  reloadAppWindow(true, () => calls.push("web"), () => calls.push("native"));

  expect(calls).toEqual(["native"]);
});
