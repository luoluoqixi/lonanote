import { history, undo, undoDepth } from "@codemirror/commands";
import { StateEffect } from "@codemirror/state";
import { Window } from "happy-dom";
import assert from "node:assert/strict";
import { test } from "node:test";

import type { EditorPlatform } from "../bridge/protocol";
import { installDesktopBackgroundFocus } from "./background_focus";
import { LonaEditor, type LonaEditorThemeColors } from "./editor";
import { createFontPresentation } from "./font_presentation";
import { applyEditorInputLease } from "./input_lease";

// happy-dom 不计算排版；仅替换坐标测量，保留真实 CodeMirror state、DOM focus 和选区事务。
const domWindow = new Window({ url: "http://localhost/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "MutationObserver",
  "HTMLElement",
  "Element",
  "Node",
  "Text",
  "DOMRect",
  "Range",
] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value:
      key === "window"
        ? domWindow
        : key === "document"
          ? domWindow.document
          : (domWindow as unknown as Record<string, unknown>)[key],
  });
}
Object.assign(globalThis, {
  getComputedStyle: domWindow.getComputedStyle.bind(domWindow),
  requestAnimationFrame: domWindow.requestAnimationFrame.bind(domWindow),
  cancelAnimationFrame: domWindow.cancelAnimationFrame.bind(domWindow),
});

const colors = Object.fromEntries(
  [
    "canvas",
    "text",
    "textMuted",
    "accent",
    "accentForeground",
    "caret",
    "selection",
    "selectionInactive",
    "gutterText",
    "gutterActiveText",
    "border",
    "codeBackground",
    "codeText",
    "inlineCodeBackground",
    "inlineCodeText",
    "formatting",
    "listMarker",
    "link",
    "quoteBorder",
    "highlightBackground",
    "checkboxBackground",
    "checkboxBorder",
    "checkboxChecked",
    "checkboxCheckmark",
    "scrollbarThumb",
    "scrollbarThumbActive",
  ].map((key) => [key, "#000000"]),
) as LonaEditorThemeColors;

function createEditor(text = "短文", readOnly = false, filePath?: string) {
  const root = document.createElement("main");
  document.body.append(root);
  const editor = new LonaEditor();
  editor.create({
    root,
    defaultValue: text,
    readOnly,
    filePath,
    theme: "none",
    themeColors: colors,
    extensionsConfig: { disableAll: true },
  });
  const view = editor.editor;
  view.contentDOM.getBoundingClientRect = () => new DOMRect(20, 10, 500, 700);
  view.posAtCoords = () => view.state.doc.length;
  view.coordsAtPos = () => ({ left: 30, right: 30, top: 10, bottom: 36 });
  Object.defineProperty(view, "documentTop", { configurable: true, value: 10 });
  view.lineBlockAt = () => ({ bottom: 26 }) as ReturnType<typeof view.lineBlockAt>;
  return { editor, root, view };
}

test("切换字体保留真实 EditorView、草稿、选区与撤销历史", async () => {
  const { editor, root, view } = createEditor("初始", false, "note.md");
  const controller = createFontPresentation({
    load: async () => {},
    apply: (family) => {
      view.contentDOM.style.fontFamily = family ?? "";
    },
    measure: () => view.requestMeasure(),
  });
  try {
    view.dispatch({ effects: StateEffect.appendConfig.of(history()) });
    view.dispatch({ changes: { from: 2, insert: "草稿" }, selection: { anchor: 3 } });
    const depth = undoDepth(view.state);
    await controller.applyFont({ family: "Example", faces: [] });
    assert.equal(editor.editor, view);
    assert.equal(view.state.doc.toString(), "初始草稿");
    assert.equal(view.state.selection.main.head, 3);
    assert.equal(undoDepth(view.state), depth);
    assert.ok(undo(view));
    assert.equal(view.state.doc.toString(), "初始");
    await controller.applyFont(null);
    assert.equal(view.contentDOM.style.fontFamily, "");
  } finally {
    controller.dispose();
    editor.destroy();
    root.remove();
  }
});

test("切换桌面布局的斜杠菜单时保留文档和选区，启用真实 PurrMD 菜单", async () => {
  const { editor, root, view } = createEditor("", false, "note.md");
  const options = {
    lineNumbers: false,
    lineWrapping: false,
    sourceMode: false,
    theme: "light" as const,
    themeColors: colors,
    slashMenu: false,
  };
  try {
    editor.updatePresentation(options);
    assert.equal(root.querySelector(".purrmd-slash-menu"), null);
    editor.updatePresentation({ ...options, slashMenu: true });
    assert.ok(root.querySelector(".purrmd-slash-menu"));
    view.dispatch({ changes: { from: 0, insert: "/" }, selection: { anchor: 1 } });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    assert.equal((root.querySelector(".purrmd-slash-menu") as HTMLElement).style.display, "block");
    editor.updatePresentation(options);
    assert.equal(root.querySelector(".purrmd-slash-menu"), null);
    assert.equal(editor.getValue(), "/");
    assert.equal(view.state.selection.main.head, 1);
  } finally {
    editor.destroy();
    root.remove();
  }
});

function mouseDown(
  init: Pick<
    MouseEventInit,
    "clientY" | "button" | "shiftKey" | "ctrlKey" | "metaKey" | "altKey" | "detail"
  > = {},
): MouseEvent {
  return new domWindow.MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
    clientX: 200,
    clientY: 600,
    ...init,
  }) as unknown as MouseEvent;
}

test("输入权启用和屏障恢复不抢走另一分屏的真实焦点和选区", () => {
  const first = createEditor("第一个编辑器");
  const second = createEditor("第二个编辑器");
  try {
    second.view.dispatch({ selection: { anchor: 2 } });
    second.view.focus();
    const session = { editor: first.editor, documentReadOnly: false, inputEnabled: false };
    assert.equal(
      applyEditorInputLease(session, { enabled: true, leaseToken: "a", identityRevision: 1 }),
      true,
    );
    assert.equal(document.activeElement, second.view.contentDOM);
    assert.equal(second.view.state.selection.main.head, 2);
    assert.equal(applyEditorInputLease(session, { enabled: false }), true);
    assert.equal(applyEditorInputLease(session, { enabled: true }), true);
    assert.equal(document.activeElement, second.view.contentDOM);
  } finally {
    first.editor.destroy();
    second.editor.destroy();
    first.root.remove();
    second.root.remove();
  }
});

test("桌面背景点击允许远离短文末尾的坐标连续恢复真实输入焦点", () => {
  const { editor, root, view } = createEditor();
  try {
    for (let index = 0; index < 3; index += 1) {
      view.contentDOM.blur();
      assert.equal(editor.focus({ x: 200, y: 600 }, { allowDocumentEnd: true }), true);
      assert.equal(document.activeElement, view.contentDOM);
      assert.equal(view.state.selection.main.head, 2);
      assert.equal(view.state.selection.main.empty, true);
    }
  } finally {
    editor.destroy();
    root.remove();
  }
});

test("桌面各层文末背景连续点击阻止原生清选区，并保持真实 CodeMirror 光标", () => {
  const { editor, root, view } = createEditor();
  const session = {
    editor,
    runtime: { platform: "windows" as EditorPlatform },
    documentReadOnly: false,
    inputEnabled: true,
  };
  const dispose = installDesktopBackgroundFocus(root, () => session);
  try {
    for (const platform of ["windows", "macos", "linux", "web"] as const) {
      session.runtime.platform = platform;
      for (const target of [document.body, root, view.dom, view.scrollDOM, view.contentDOM]) {
        for (let detail = 1; detail <= 3; detail += 1) {
          const event = mouseDown({ detail });
          target.dispatchEvent(event);
          assert.equal(event.defaultPrevented, true);
          assert.equal(document.activeElement, view.contentDOM);
          assert.equal(view.state.selection.main.head, 2);
          assert.equal(view.state.selection.main.empty, true);
        }
      }
    }
  } finally {
    dispose();
    editor.destroy();
    root.remove();
  }
});

test("正文、图片 widget、移动平台和非普通左击保留既有处理", () => {
  const { editor, root, view } = createEditor();
  const session = {
    editor,
    runtime: { platform: "windows" as EditorPlatform },
    documentReadOnly: false,
    inputEnabled: true,
  };
  const dispose = installDesktopBackgroundFocus(root, () => session);
  const widget = document.createElement("img");
  root.append(widget);
  const line = document.createElement("div");
  line.className = "cm-line";
  root.append(line);
  try {
    const cases = [
      { target: root, clientY: 36 },
      { target: widget, clientY: 600 },
      { target: line, clientY: 600 },
      { target: root, clientY: 600, button: 2 },
      { target: root, clientY: 600, shiftKey: true },
      { target: root, clientY: 600, ctrlKey: true },
    ];
    for (const { target, ...init } of cases) {
      const event = mouseDown(init);
      target.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
    }
    for (const platform of ["ios", "android"] as const) {
      session.runtime.platform = platform;
      const event = mouseDown();
      root.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
      assert.notEqual(document.activeElement, view.contentDOM);
    }
  } finally {
    dispose();
    editor.destroy();
    root.remove();
  }
});

test("初始只读和动态输入 lease 关闭时背景点击不会获取输入焦点", () => {
  for (const initialReadOnly of [true, false]) {
    const { editor, root, view } = createEditor("短文", initialReadOnly);
    const session = {
      editor,
      runtime: { platform: "windows" as const },
      documentReadOnly: initialReadOnly,
      inputEnabled: true,
    };
    const dispose = installDesktopBackgroundFocus(root, () => session);
    try {
      if (!initialReadOnly) {
        session.inputEnabled = false;
        editor.setReadonly(true);
      }
      const event = mouseDown();
      root.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false);
      assert.notEqual(document.activeElement, view.contentDOM);
      assert.equal(view.state.selection.main.head, 0);
      if (!initialReadOnly) {
        session.inputEnabled = true;
        editor.setReadonly(false);
        root.dispatchEvent(mouseDown());
        assert.equal(document.activeElement, view.contentDOM);
        assert.equal(view.state.selection.main.head, 2);
      }
    } finally {
      dispose();
      editor.destroy();
      root.remove();
    }
  }
});

test("默认坐标聚焦保留移动平台远距离误定位保护", () => {
  const { editor, root, view } = createEditor();
  try {
    assert.equal(editor.focus({ x: 200, y: 600 }), false);
    assert.notEqual(document.activeElement, view.contentDOM);
    assert.equal(editor.focus({ x: 200, y: 25 }), true);
    assert.equal(document.activeElement, view.contentDOM);
  } finally {
    editor.destroy();
    root.remove();
  }
});

test("桌面实际正文坐标仍定位到命中的字符，空文档背景可以聚焦", () => {
  const { editor, root, view } = createEditor();
  try {
    view.posAtCoords = () => 1;
    assert.equal(editor.focus({ x: 30, y: 25 }, { allowDocumentEnd: true }), true);
    assert.equal(view.state.selection.main.head, 1);
  } finally {
    editor.destroy();
    root.remove();
  }
  const empty = createEditor("");
  try {
    assert.equal(empty.editor.focus({ x: 200, y: 600 }, { allowDocumentEnd: true }), true);
    assert.equal(document.activeElement, empty.view.contentDOM);
    assert.equal(empty.view.state.selection.main.head, 0);
  } finally {
    empty.editor.destroy();
    empty.root.remove();
  }
});
