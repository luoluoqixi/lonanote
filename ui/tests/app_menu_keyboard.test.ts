import { expect, test } from "bun:test";
import { Window } from "happy-dom";

import {
  createAppMenuFocusRestoration,
  installAppMenuKeyboard,
  restoreAppMenuFocus,
} from "../src/components/app_menu/app_menu_keyboard.web";

test("退出 Alt 的焦点恢复只生效一次，重新打开后 hover 切换不会恢复旧焦点", () => {
  let restores = 0;
  const focus = createAppMenuFocusRestoration(() => {
    restores++;
  });
  focus.arm();
  expect(focus.consume()).toBe(true);
  expect(focus.consume()).toBe(false);
  expect(restores).toBe(1);
  // 未展开菜单便退出 Alt 时没有 close 回调；下次鼠标打开必须清理遗留请求。
  focus.arm();
  focus.clear();
  expect(focus.consume()).toBe(false);
  expect(restores).toBe(1);
});

test("再次按 Alt 或 Escape 都退出并恢复焦点，原焦点不可聚焦时仍移除菜单焦点", () => {
  const win = new Window();
  win.document.body.innerHTML =
    '<button id="editor">编辑区</button><button data-app-menu-trigger="file">文件</button>';
  const previous = win.document.querySelector<HTMLButtonElement>("#editor")!;
  const trigger = win.document.querySelector<HTMLButtonElement>("[data-app-menu-trigger]")!;
  let hints = false;
  const cleanup = installAppMenuKeyboard(win as unknown as Window, {
    blocked: () => false,
    focus: () => trigger.focus(),
    open: () => {},
    reset: () =>
      restoreAppMenuFocus(win.document as unknown as Document, previous as unknown as HTMLElement),
    showHints: (show) => {
      hints = show;
    },
  });
  const alt = () => {
    win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Alt" }));
    win.dispatchEvent(new win.KeyboardEvent("keyup", { key: "Alt" }));
  };
  previous.focus();
  alt();
  expect(win.document.activeElement).toBe(trigger);
  expect(hints).toBe(true);
  win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
  expect(win.document.activeElement).toBe(previous);
  expect(hints).toBe(false);
  alt();
  alt();
  expect(win.document.activeElement).toBe(previous);
  trigger.focus();
  restoreAppMenuFocus(
    win.document as unknown as Document,
    win.document.body as unknown as HTMLElement,
  );
  expect(win.document.activeElement).not.toBe(trigger);
  cleanup();
});

test("单按 Alt 聚焦，Alt+字母展开；AltGr、组合键和弹窗内不抢焦点", () => {
  const win = new Window();
  const calls: string[] = [];
  let blocked = false;
  const cleanup = installAppMenuKeyboard(win as unknown as Window, {
    blocked: () => blocked,
    focus: () => calls.push("focus"),
    open: (id) => calls.push(id),
    reset: () => calls.push("reset"),
    showHints: (show) => calls.push(`hints:${show}`),
  });
  const key = (type: string, key: string, options = {}) => {
    const event = new win.KeyboardEvent(type, { key, ...options });
    // happy-dom 将 AltGraph 错误地等同于 Alt，这里补足真实浏览器的区分。
    event.getModifierState = (modifier) =>
      modifier === "AltGraph" ? false : modifier === "Alt" && event.altKey;
    return win.dispatchEvent(event);
  };
  key("keydown", "Alt");
  key("keyup", "Alt");
  expect(calls).toContain("focus");
  calls.length = 0;
  key("keydown", "Alt");
  key("keydown", "e", { altKey: true });
  key("keyup", "Alt");
  expect(calls).toContain("edit");
  expect(calls).not.toContain("focus");
  calls.length = 0;
  key("keydown", "f", { altKey: true, ctrlKey: true });
  blocked = true;
  key("keydown", "f", { altKey: true });
  expect(calls).not.toContain("file");
  cleanup();
});

test("Alt 组合键不在释放 Alt 时激活菜单，失焦清理助记状态", () => {
  const win = new Window();
  const calls: string[] = [];
  const cleanup = installAppMenuKeyboard(win as unknown as Window, {
    blocked: () => false,
    focus: () => calls.push("focus"),
    open: () => calls.push("open"),
    reset: () => calls.push("reset"),
    showHints: (show) => calls.push(`hints:${show}`),
  });
  win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Alt" }));
  win.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Tab", altKey: true }));
  win.dispatchEvent(new win.KeyboardEvent("keyup", { key: "Alt" }));
  expect(calls).not.toContain("focus");
  win.dispatchEvent(new win.Event("blur"));
  expect(calls.at(-1)).toBe("reset");
  cleanup();
});
