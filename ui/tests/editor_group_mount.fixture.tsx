import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useEffect } from "react";

const win = new Window();
globalThis.window = win as any;
globalThis.document = win.document as any;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module("react-native", () => ({
  View: ({
    children,
    nativeID,
    pointerEvents,
    onLayout,
    onTouchStart,
    onPointerDown,
    ...props
  }: any) => (
    <div id={nativeID} {...props}>
      {children}
    </div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  StyleSheet: { create: (styles: any) => styles, absoluteFillObject: {} },
  PanResponder: { create: () => ({ panHandlers: {} }) },
}));
mock.module("rn-ui-kit", () => ({
  useUiTheme: () => ({ background: "white", border: "gray" }),
  Spinner: () => null,
}));
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isWeb: () => true }));
mock.module("../src/hooks/ui/use_workbench_drag_guard", () => ({
  useWorkbenchDragGuard: () => ({ onDragStart() {}, onDragEnd() {} }),
}));
mock.module("../src/components/editor/desktop/desktop_editor_group", () => ({
  DesktopEditorGroup: () => null,
}));
mock.module("../src/components/editor/editor_toolbar", () => ({ EditorToolbar: () => null }));
let mounts = 0;
mock.module("../src/components/editor/editor_webview", () => ({
  EditorWebView: () => {
    useEffect(() => {
      mounts++;
    }, []);
    return <iframe data-editor="a" />;
  },
}));
let state: any = {
  layout: {
    kind: "split",
    splitId: "s",
    direction: "row",
    ratio: 0.5,
    first: { kind: "group", groupId: "left" },
    second: { kind: "group", groupId: "right" },
  },
  groupsById: {
    left: { tabIds: ["a"], activeTabId: "a" },
    right: { tabIds: [], activeTabId: null },
  },
  activeGroupId: "left",
  editorsById: { a: { editorId: "a", documentId: "d", groupId: "left" } },
  documentsById: { d: { loadState: "ready" } },
};
mock.module("../src/hooks/editor", () => ({
  useEditorSession: () => ({ getSnapshot: () => state }),
}));
const { createRoot } = await import("react-dom/client");
const { getEditorGroupAtPoint } =
  await import("../src/components/editor/desktop/editor_group_hit.web");
const { DesktopEditorArea } = await import("../src/components/editor/desktop/desktop_editor_area");
test("跨组移动和 resize 保留同一个 iframe 挂载", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(() => root.render(<DesktopEditorArea />));
    const iframe = host.querySelector("iframe");
    expect(iframe).not.toBeNull();
    state = {
      ...state,
      activeGroupId: "right",
      groupsById: {
        left: { tabIds: [], activeTabId: null },
        right: { tabIds: ["a"], activeTabId: "a" },
      },
      editorsById: { a: { ...state.editorsById.a, groupId: "right" } },
    };
    await act(() => root.render(<DesktopEditorArea />));
    expect(host.querySelector("iframe")).toBe(iframe);
    document.elementFromPoint = () => iframe;
    expect(getEditorGroupAtPoint(1, 1)).toBe("right");
    state = { ...state, layout: { ...state.layout, ratio: 0.7 } };
    await act(() => root.render(<DesktopEditorArea />));
    expect(host.querySelector("iframe")).toBe(iframe);
    expect(mounts).toBe(1);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
