import { expect, test } from "bun:test";
import { Window } from "happy-dom";
import { readFileSync } from "node:fs";

const script = readFileSync(
  new URL("../src-tauri/src/setup/external_file_drop.js", import.meta.url),
  "utf8",
);

test("外部文件交给原生 File bridge，不插入路径；内部标签拖放不受影响", () => {
  const win = new Window();
  const calls: unknown[][] = [];
  (win as any).chrome = {
    webview: { postMessageWithAdditionalObjects: (...args: unknown[]) => calls.push(args) },
  };
  win.document.body.innerHTML =
    '<div id="desktop-editor-area"><div id="editor"></div><iframe></iframe></div>';
  new Function("window", "document", "CustomEvent", script)(win, win.document, win.CustomEvent);
  const file = new win.File(["# note"], "note.md");
  const drop = new win.MouseEvent("drop", {
    bubbles: true,
    cancelable: true,
    clientX: 20,
    clientY: 30,
  });
  Object.defineProperty(drop, "dataTransfer", { value: { types: ["Files"], files: [file] } });
  let defaults = 0;
  win.document.addEventListener("drop", () => defaults++);
  win.document.getElementById("editor")!.dispatchEvent(drop);
  expect(drop.defaultPrevented).toBe(true);
  expect(defaults).toBe(0);
  expect(calls).toEqual([[{ channel: "lonanote:external-file-drop", x: 20, y: 30 }, [file]]]);
  const internal = new win.MouseEvent("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(internal, "dataTransfer", {
    value: { types: ["application/x-lonanote-editor-tab"], files: [] },
  });
  win.document.getElementById("editor")!.dispatchEvent(internal);
  expect(internal.defaultPrevented).toBe(false);
  expect(defaults).toBe(1);
  expect(calls).toHaveLength(1);
  const frame = win.document.querySelector("iframe")!;
  Object.defineProperty(frame, "contentWindow", { value: new Window() });
  frame.getBoundingClientRect = () => ({ left: 100, top: 50 }) as DOMRect;
  win.dispatchEvent(
    new win.MessageEvent("message", {
      source: frame.contentWindow,
      data: { channel: "lonanote:external-file-drop", files: [file], x: 3, y: 4 },
    }),
  );
  expect(calls[1]).toEqual([{ channel: "lonanote:external-file-drop", x: 103, y: 54 }, [file]]);
  win.dispatchEvent(
    new win.MessageEvent("message", {
      source: null,
      data: { channel: "lonanote:external-file-drop", files: [file], x: 3, y: 4 },
    }),
  );
  expect(calls).toHaveLength(2);
  const outside = new win.MouseEvent("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(outside, "dataTransfer", {
    value: { types: ["Files"], files: [file] },
  });
  win.document.body.dispatchEvent(outside);
  expect(outside.defaultPrevented).toBe(true);
  expect(calls).toHaveLength(2);
  let bridgeError = "";
  win.addEventListener("lonanote:external-file-drop", (event: any) => {
    bridgeError = event.detail.error;
  });
  (win as any).chrome.webview.postMessageWithAdditionalObjects = () => {
    throw new Error("bridge unavailable");
  };
  const failedDrop = new win.MouseEvent("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(failedDrop, "dataTransfer", {
    value: { types: ["Files"], files: [file] },
  });
  win.document.getElementById("editor")!.dispatchEvent(failedDrop);
  expect(bridgeError).toContain("bridge unavailable");
  win.happyDOM.abort();
});
