import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Window } from "happy-dom";
import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeEditorText, textChange } from "../bridge/text_change";
import { captureEditorViewState, restoreEditorViewState } from "./view_snapshot";

test("真实CodeMirror恢复双向选区和滚动且不抢焦点，过期坐标按文本范围clamp", () => {
  const window = new Window({ url: "http://localhost" });
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
  ] as const)
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value:
        key === "window"
          ? window
          : key === "document"
            ? window.document
            : (window as unknown as Record<string, unknown>)[key],
    });
  Object.assign(globalThis, {
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  });
  const root = document.createElement("main");
  document.body.append(root);
  const view = new EditorView({ state: EditorState.create({ doc: "abcdef" }), parent: root });
  const scroller = document.createElement("div");
  Object.defineProperties(scroller, {
    scrollHeight: { value: 1000 },
    clientHeight: { value: 200 },
  });
  try {
    restoreEditorViewState(view, scroller, { selection: { anchor: 5, head: 2 }, scrollTop: 123 });
    assert.deepEqual(captureEditorViewState(view, scroller), {
      selection: { anchor: 5, head: 2 },
      scrollTop: 123,
    });
    assert.equal(view.hasFocus, false);
    restoreEditorViewState(view, scroller, {
      selection: { anchor: 999, head: -2 },
      scrollTop: 9999,
    });
    assert.deepEqual(captureEditorViewState(view, scroller), {
      selection: { anchor: 6, head: 0 },
      scrollTop: 800,
    });
    assert.equal(view.hasFocus, false);
  } finally {
    view.destroy();
    root.remove();
    window.happyDOM.abort();
  }
});

test("CRLF文件双view首输入增量使用同一LF坐标且可共享撤销", () => {
  const window = new Window({ url: "http://localhost" });
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
  ] as const)
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value:
        key === "window"
          ? window
          : key === "document"
            ? window.document
            : (window as unknown as Record<string, unknown>)[key],
    });
  Object.assign(globalThis, {
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  });
  const draft = normalizeEditorText("a\r\nb\r\nc");
  const root = document.createElement("main");
  document.body.append(root);
  const first = new EditorView({ state: EditorState.create({ doc: draft }), parent: root });
  const second = new EditorView({ state: EditorState.create({ doc: draft }), parent: root });
  try {
    first.dispatch({ changes: { from: first.state.doc.length, insert: "X" } });
    const change = textChange(draft, first.state.doc.toString());
    second.dispatch({ changes: change });
    assert.equal(second.state.doc.toString(), "a\nb\ncX");
    const inverse = textChange(first.state.doc.toString(), draft);
    first.dispatch({ changes: inverse });
    second.dispatch({ changes: inverse });
    assert.equal(first.state.doc.toString(), "a\nb\nc");
    assert.equal(second.state.doc.toString(), first.state.doc.toString());
  } finally {
    first.destroy();
    second.destroy();
    root.remove();
    window.happyDOM.abort();
  }
});
