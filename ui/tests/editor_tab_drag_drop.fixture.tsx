import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window();
globalThis.window = win as any;
globalThis.document = win.document as any;
globalThis.Event = win.Event as any;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module("../src/api/common/platform", () => ({ isTauri: () => false, isDesktop: () => true }));
mock.module("rn-ui-kit", () => ({ useUiTheme: () => ({ primary: "#3478f6" }) }));
const drops: unknown[] = [];
const errors: unknown[] = [];
mock.module("../src/components/editor/controllers/editor_window_service", () => ({
  editorWindowService: {
    getBootstrapSnapshot: () => ({
      windowLabel: "main",
      ownerWindowLabel: "main",
      sessionId: "session",
    }),
    dropTab: async (...args: unknown[]) => {
      drops.push(args);
    },
    moveTabToGroup: async (id: string, group: string, before: string | null) => {
      editorStore.getState().moveEditorToGroup(id, group, before);
    },
    dropWorkspaceFiles: async (...args: unknown[]) => {
      drops.push(args);
    },
    beginWorkspaceFileDrag: () => "file-ticket",
  },
}));
const { editorStore } = await import("../src/stores/editor");
const { EditorTabDragInput } =
  await import("../src/components/editor/desktop/editor_tab_drag_input.web");
const { EditorTabDropTarget } =
  await import("../src/components/editor/desktop/editor_tab_drop_target.web");
const { EDITOR_TAB_DRAG_TYPE } =
  await import("../src/components/editor/desktop/editor_tab_drag_data");
const { createRoot } = await import("react-dom/client");

test("跨组拖动保留 editor 身份，跨窗口仅向 owner 交接凭据，拒绝其他会话", async () => {
  const first = editorStore.getState().openEditor({ kind: "untitled" });
  const group = editorStore.getState().splitEditor(first.editorId, "row");
  const target = editorStore.getState().activeEditorId!;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <>
        <EditorTabDragInput
          editorId={first.editorId}
          enabled
          dragging={false}
          viewRef={() => {}}
          onLayout={() => {}}
          onStart={() => {}}
          onMove={() => {}}
          onFinish={() => {}}
        >
          <span>source</span>
        </EditorTabDragInput>
        <EditorTabDropTarget groupId={group} onError={(error) => errors.push(error)}>
          <div id="drop" data-editor-tab-id={target}>
            target
          </div>
        </EditorTabDropTarget>
      </>,
    );
  });
  const values = new Map<string, string>();
  const dataTransfer = {
    setData: (type: string, value: string) => values.set(type, value),
    getData: (type: string) => values.get(type) ?? "",
    get types() {
      return [...values.keys()];
    },
    effectAllowed: "",
    dropEffect: "",
  };
  const fire = (element: Element, type: string) => {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { dataTransfer, clientX: -1 });
    element.dispatchEvent(event as any);
  };
  await act(async () => {
    fire(host.querySelector("[draggable]")!, "dragstart");
  });
  expect(document.documentElement.hasAttribute("data-editor-tab-dragging")).toBe(true);
  await act(async () => fire(host.querySelector("#drop")!, "dragover"));
  expect(host.querySelector("[data-editor-tab-insertion-marker]")).not.toBeNull();
  await act(async () => {
    fire(host.querySelector("#drop")!, "drop");
  });
  expect(editorStore.getState().groupsById[group].tabIds).toEqual([target]);
  expect(editorStore.getState().editorsById[first.editorId]).toBeUndefined();
  expect(editorStore.getState().editorsById[target].documentId).toBe(first.documentId);
  expect(host.querySelector("[data-editor-tab-insertion-marker]")).toBeNull();
  values.set(
    EDITOR_TAB_DRAG_TYPE,
    JSON.stringify({
      editorId: "remote",
      windowLabel: "aux",
      sessionId: "session",
      token: "ticket",
    }),
  );
  await act(async () => {
    fire(host.querySelector("#drop")!, "drop");
  });
  expect(drops).toEqual([["ticket", group, target]]);
  values.set(
    EDITOR_TAB_DRAG_TYPE,
    JSON.stringify({
      editorId: "remote",
      windowLabel: "aux",
      sessionId: "foreign",
      token: "ticket",
    }),
  );
  await act(async () => {
    fire(host.querySelector("#drop")!, "drop");
  });
  expect(drops).toHaveLength(1);
  expect(errors).toHaveLength(1);
  await act(() => root.unmount());
});

test("位置线按滚动后的标签边界定位，空白区放到末尾且结束后清理", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(() =>
    root.render(
      <EditorTabDropTarget groupId="target" onError={(e) => errors.push(e)}>
        <div data-editor-tab-id="first">first</div>
        <div data-editor-tab-id="second">second</div>
      </EditorTabDropTarget>,
    ),
  );
  const container = host.firstElementChild!;
  container.getBoundingClientRect = () => ({ left: 50, width: 240 }) as DOMRect;
  const tabs = host.querySelectorAll<HTMLElement>("[data-editor-tab-id]");
  tabs[0].getBoundingClientRect = () => ({ left: -20, width: 100, right: 80 }) as DOMRect;
  tabs[1].getBoundingClientRect = () => ({ left: 80, width: 100, right: 180 }) as DOMRect;
  const dataTransfer = {
    types: [EDITOR_TAB_DRAG_TYPE],
    dropEffect: "",
    getData: () =>
      JSON.stringify({
        editorId: "remote",
        windowLabel: "aux",
        sessionId: "session",
        token: "position",
      }),
  };
  const fire = (type: string, clientX: number) => {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { dataTransfer, clientX });
    container.dispatchEvent(event as any);
  };
  const marker = () => host.querySelector<HTMLElement>("[data-editor-tab-insertion-marker]");
  try {
    await act(() => fire("dragover", 90));
    expect(marker()?.style.left).toBe("30px");
    await act(() => fire("drop", 90));
    expect(drops.at(-1)).toEqual(["position", "target", "second"]);
    expect(marker()).toBeNull();
    await act(() => fire("dragover", 250));
    expect(marker()?.style.left).toBe("130px");
    await act(() => fire("drop", 250));
    expect(drops.at(-1)).toEqual(["position", "target", null]);
    await act(() => fire("dragover", 0));
    expect(marker()?.style.left).toBe("0px");
    await act(() => document.dispatchEvent(new win.Event("dragend") as any));
    expect(marker()).toBeNull();
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});

test("文件树 HTML 拖放能交给编辑区遮罩，目录不携带打开凭据", async () => {
  const { TreeDragInput } =
    await import("../src/components/workspaces/workspace_explorer/tree/tree_drag_input.web");
  const { EditorWorkspaceFileDrop } =
    await import("../src/components/editor/desktop/editor_workspace_file_drop.web");
  const { WORKSPACE_FILE_DRAG_TYPE } =
    await import("../src/components/editor/controllers/workspace_file_drag");
  const host = document.createElement("div");
  host.id = "desktop-editor-group-files";
  document.body.append(host);
  const root = createRoot(host);
  let folder = false;
  const finishes: boolean[] = [];
  await act(async () =>
    root.render(
      <>
        <TreeDragInput
          enabled
          viewRef={() => {}}
          onLayout={() => {}}
          onStart={() => {}}
          onMove={() => {}}
          onFinish={(value) => finishes.push(value)}
          nativeData={() => ({
            files: folder ? [] : ["a.md"],
            workspaceId: "workspace",
            label: "a.md",
          })}
        >
          <span>file</span>
        </TreeDragInput>
        <EditorWorkspaceFileDrop groupId="files" onError={(error) => errors.push(error)} />
      </>,
    ),
  );
  const values = new Map<string, string>();
  const dataTransfer = {
    setData: (type: string, value: string) => values.set(type, value),
    getData: (type: string) => values.get(type) ?? "",
    get types() {
      return [...values.keys()];
    },
    setDragImage: () => {},
    effectAllowed: "",
    dropEffect: "",
  };
  const fire = (target: EventTarget, type: string) => {
    const event = new win.Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { dataTransfer, clientX: 20, clientY: 20 });
    target.dispatchEvent(event as any);
  };
  await act(async () => fire(host.querySelector("[draggable]")!, "dragstart"));
  expect(JSON.parse(values.get(WORKSPACE_FILE_DRAG_TYPE)!)).toMatchObject({
    token: "file-ticket",
    sessionId: "session",
    ownerWindowLabel: "main",
  });
  await act(async () => fire(document, "dragenter"));
  expect(document.querySelector("[data-workspace-file-drop=files]")).not.toBeNull();
  await act(async () => fire(document.querySelector("[data-workspace-file-drop=files]")!, "drop"));
  expect(drops.at(-1)).toEqual(["file-ticket", "files"]);
  expect(document.querySelector("[data-workspace-file-drop=files]")).toBeNull();
  await act(async () => fire(host.querySelector("[draggable]")!, "dragend"));
  expect(finishes.at(-1)).toBe(false);
  folder = true;
  values.clear();
  await act(async () => fire(host.querySelector("[draggable]")!, "dragstart"));
  expect(values.has(WORKSPACE_FILE_DRAG_TYPE)).toBe(false);
  await act(async () => fire(host.querySelector("[draggable]")!, "dragend"));
  await act(() => root.unmount());
  host.remove();
});
