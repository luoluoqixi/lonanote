import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window();
globalThis.window = win as unknown as Window;
globalThis.document = win.document as unknown as Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let nextFrame = 0;
const frames = new Map<number, FrameRequestCallback>();
globalThis.requestAnimationFrame = (callback) => {
  frames.set(++nextFrame, callback);
  return nextFrame;
};
globalThis.cancelAnimationFrame = (id) => {
  frames.delete(id);
};
mock.module("../src/api/common/platform", () => ({ isWeb: () => true }));
let overEditor = false;
mock.module("../src/components/workspaces/workspace_explorer/tree/tree_drag_hit", () => ({
  canStartTreeDrag: () => true,
  readTreeDragBounds: (view) => {
    if (!view?.getBoundingClientRect || !view.clientHeight) return null;
    const rect = view.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      scaleY: rect.height / view.clientHeight,
    };
  },
  isTreeEditorDrop: () => overEditor,
}));
const { createRoot } = await import("react-dom/client");
const { useTreeDrag } =
  await import("../src/components/workspaces/workspace_explorer/tree/use_tree_drag");
const { canStartTreeDrag, readTreeDragBounds, isTreeEditorDrop } =
  await import("../src/components/workspaces/workspace_explorer/tree/tree_drag_hit.web");

const gestureCallbacks: Record<string, (...args: unknown[]) => void> = {};
const builder = new Proxy(
  {},
  {
    get:
      (_target, name: string) =>
      (...args: unknown[]) => {
        if (name.startsWith("on")) gestureCallbacks[name] = args[0] as (...args: unknown[]) => void;
        return builder;
      },
  },
);
mock.module("react-native-gesture-handler", () => ({
  Gesture: { Pan: () => builder },
  MouseButton: { LEFT: 1 },
  PointerType: { MOUSE: 1 },
  GestureDetector: ({ children }) => children,
}));
mock.module("react-native", () => ({
  View: React.forwardRef(({ children }, ref) => <div ref={ref}>{children}</div>),
}));
const { TreeDragInput } =
  await import("../src/components/workspaces/workspace_explorer/tree/tree_drag_input");
mock.module("rn-ui-kit", () => ({
  useUiTheme: () => ({ primary: "#3478f6", popover: "#ffffff", foreground: "#111111" }),
}));
mock.module("lucide-react-native", () => ({
  FileText: () => null,
  Files: () => null,
  Folder: () => null,
}));
const { TreeDragPreview } =
  await import("../src/components/workspaces/workspace_explorer/tree/tree_drag_preview.web");

test("拖拽预览在鼠标右下方跟随，显示名称/多选数量，退出恢复指针并释放动画", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const pointer = { current: { x: 40, y: 60 } };
  try {
    await act(() =>
      root.render(
        <TreeDragPreview pointer={pointer} sources={["folder/note.md"]} folder={false} />,
      ),
    );
    const ghost = document.body.querySelector<HTMLDivElement>('[aria-hidden="true"]')!;
    expect(ghost.textContent).toBe("note.md");
    expect(ghost.style.transform).toBe("translate3d(54px, 78px, 0)");
    expect(ghost.style.pointerEvents).toBe("none");
    expect(document.documentElement.hasAttribute("data-workspace-tree-dragging")).toBe(true);
    pointer.current = { x: 100, y: 120 };
    const [id, callback] = [...frames.entries()][0];
    frames.delete(id);
    callback(16);
    expect(ghost.style.transform).toBe("translate3d(114px, 138px, 0)");
    await act(() =>
      root.render(<TreeDragPreview pointer={pointer} sources={["a.md", "b.md"]} folder={false} />),
    );
    expect(ghost.textContent).toBe("2 个项目");
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
  expect(document.documentElement.hasAttribute("data-workspace-tree-dragging")).toBe(false);
  expect(frames.size).toBe(0);
  expect(document.body.querySelector('[aria-hidden="true"]')).toBeNull();
});

test("Pan 激活后原生取消的 onEnd(false) 不提交，起点取按下位置", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const starts: number[][] = [];
  const finishes: boolean[] = [];
  try {
    await act(() =>
      root.render(
        <TreeDragInput
          enabled
          viewRef={() => {}}
          onLayout={() => {}}
          onStart={(...point) => starts.push(point)}
          onMove={() => {}}
          onFinish={(success) => finishes.push(success)}
        >
          <div />
        </TreeDragInput>,
      ),
    );
    gestureCallbacks.onBegin({ absoluteX: 20, absoluteY: 15 });
    // Pan 激活时 translation 可能已被库归零，不能据此重新推导来源行。
    gestureCallbacks.onStart({ absoluteX: 20, absoluteY: 50, translationX: 0, translationY: 0 });
    expect(starts).toEqual([[20, 15, 20, 50]]);
    gestureCallbacks.onEnd({ absoluteX: 20, absoluteY: 75 }, false);
    gestureCallbacks.onFinalize();
    expect(finishes).toEqual([false, false]);
    finishes.length = 0;
    gestureCallbacks.onEnd({ absoluteX: 20, absoluteY: 75 }, true);
    gestureCallbacks.onFinalize();
    expect(finishes).toEqual([true, false]);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});

test("Web 拖动只从条目正文开始，按钮/菜单/滚动条不触发且读取真实缩放", () => {
  const container = document.createElement("div");
  container.innerHTML =
    '<div role="button"><div role="treeitem" id="workspace-tree-note.md"><span id="label">note.md</span><button id="expand">展开</button></div><div id="scrollbar"></div></div>';
  document.body.append(container);
  let target = container.querySelector("#label");
  const previous = document.elementFromPoint;
  document.elementFromPoint = () => target;
  try {
    expect(canStartTreeDrag(1, 1, "note.md")).toBe(true);
    target = container.querySelector("#expand");
    expect(canStartTreeDrag(1, 1, "note.md")).toBe(false);
    target = container.querySelector("#scrollbar");
    expect(canStartTreeDrag(1, 1, "note.md")).toBe(false);
    Object.defineProperty(container, "clientHeight", { value: 100 });
    container.getBoundingClientRect = () => ({ left: 20, top: 40, width: 300, height: 200 });
    expect(readTreeDragBounds(container)).toEqual({
      left: 20,
      top: 40,
      width: 300,
      height: 200,
      scaleY: 2,
    });
  } finally {
    document.elementFromPoint = previous;
    container.remove();
  }
});

test("拖放提交复用移动回调，多选不丢失，取消/切换工作区/延迟测量均不移动", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const moves: { paths: string[]; directory: string }[] = [];
  let drag!: ReturnType<typeof useTreeDrag>;
  let epoch = 1;
  let workspaceId = "a";
  let offset = 0;
  const rows = ["a.md", "b.md", "folder"].map((path) => ({
    kind: "node" as const,
    key: path,
    path,
    parentPath: "",
    depth: 0,
    isLoading: false,
    entry: {
      path,
      fileType: path === "folder" ? ("directory" as const) : ("file" as const),
      createTime: null,
      lastModifiedTime: null,
      size: null,
    },
  }));
  const select = mock();
  function Probe() {
    drag = useTreeDrag({
      workspaceId,
      epoch,
      enabled: true,
      rows,
      selectedPaths: ["a.md", "b.md"],
      expandedPaths: ["folder"],
      rowHeight: 30,
      getOffset: () => offset,
      scrollTo: (value) => {
        offset = value;
      },
      select,
      expand: async () => {},
      move: (paths, directory) => {
        moves.push({ paths, directory });
      },
    });
    return null;
  }
  const render = () => act(() => root.render(<Probe />));
  const measured = { measureInWindow: (callback) => callback(0, 0, 200, 120) };
  try {
    await render();
    drag.viewRef(measured);
    drag.onLayout(120);
    await act(() => drag.start(30, 15, 30, 75));
    expect(drag.preview?.target?.directory).toBe("folder");
    expect(select).not.toHaveBeenCalled();
    await act(() => drag.finish(true));
    expect(moves).toEqual([{ paths: ["a.md", "b.md"], directory: "folder" }]);
    expect(drag.isSuppressingPress()).toBe(true);
    await act(() => {
      drag.start(30, 15, 30, 75);
      window.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Escape" }));
      drag.finish(true);
    });
    expect(moves).toHaveLength(1);
    await act(() => drag.start(30, 15, 30, 75));
    workspaceId = "b";
    epoch++;
    await render();
    await act(() => drag.finish(true));
    expect(moves).toHaveLength(1);
    let measure!: (...args: number[]) => void;
    drag.viewRef({
      measureInWindow: (callback) => {
        measure = callback;
      },
    });
    await act(() => {
      drag.start(30, 15, 30, 75);
      drag.finish(true);
      measure(0, 0, 200, 120);
    });
    expect(drag.preview).toBeNull();
    expect(moves).toHaveLength(1);
    expect(frames.size).toBe(0);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});

test("真实 DOM 拖动容器无需 measureInWindow 即可启动并提交目录移动", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const moved = mock();
  let drag!: ReturnType<typeof useTreeDrag>;
  const rows = ["note.md", "folder"].map((path) => ({
    kind: "node" as const,
    key: path,
    path,
    parentPath: "",
    depth: 0,
    isLoading: false,
    entry: {
      path,
      fileType: path === "folder" ? ("directory" as const) : ("file" as const),
      createTime: null,
      lastModifiedTime: null,
      size: null,
    },
  }));
  function Probe() {
    drag = useTreeDrag({
      workspaceId: "dom",
      epoch: 1,
      enabled: true,
      rows,
      selectedPaths: ["note.md"],
      expandedPaths: ["folder"],
      rowHeight: 30,
      getOffset: () => 0,
      scrollTo: () => {},
      select: () => {},
      expand: async () => {},
      move: moved,
    });
    return (
      <div
        ref={(node) => {
          if (node) {
            Object.defineProperty(node, "clientHeight", { value: 120, configurable: true });
            node.getBoundingClientRect = () =>
              ({ left: 0, top: 0, width: 200, height: 120 }) as DOMRect;
          }
          drag.viewRef(node as never);
        }}
      />
    );
  }
  try {
    await act(() => root.render(<Probe />));
    await act(() => drag.start(30, 15, 30, 45));
    expect(drag.preview?.target?.directory).toBe("folder");
    await act(() => drag.finish(true));
    expect(moved).toHaveBeenCalledWith(["note.md"], "folder");
    expect(frames.size).toBe(0);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});

test("编辑器和标签栏命中包含 iframe，区域外不接受打开", () => {
  const area = document.createElement("div");
  area.id = "desktop-editor-area";
  area.innerHTML = '<div id="tabs"></div><iframe></iframe>';
  document.body.append(area);
  const previous = document.elementFromPoint;
  let target: Element | null = area.querySelector("#tabs");
  document.elementFromPoint = () => target;
  try {
    expect(isTreeEditorDrop(300, 10)).toBe(true);
    target = area.querySelector("iframe");
    expect(isTreeEditorDrop(300, 100)).toBe(true);
    target = document.body;
    expect(isTreeEditorDrop(1, 1)).toBe(false);
  } finally {
    document.elementFromPoint = previous;
    area.remove();
  }
});

test("拖入编辑区域只打开文件，取消和工作区切换不打开，只读也能打开", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const opens: string[][] = [];
  const move = mock();
  let drag!: ReturnType<typeof useTreeDrag>;
  let epoch = 1;
  let selectedPaths = ["note.md", "folder"];
  const rows = ["note.md", "folder", "folder/nested.md"].map((path) => ({
    kind: "node" as const,
    key: path,
    path,
    parentPath: "",
    depth: 0,
    isLoading: false,
    entry: {
      path,
      fileType: path === "folder" ? ("directory" as const) : ("file" as const),
      createTime: null,
      lastModifiedTime: null,
      size: null,
    },
  }));
  let canMove = true;
  function Probe() {
    drag = useTreeDrag({
      workspaceId: "a",
      epoch,
      enabled: true,
      rows,
      selectedPaths,
      expandedPaths: [],
      rowHeight: 30,
      getOffset: () => 0,
      scrollTo: () => {},
      select: () => {},
      expand: async () => {},
      move: canMove ? move : undefined,
      open: (paths) => opens.push(paths),
    });
    return null;
  }
  const render = () => act(() => root.render(<Probe />));
  const start = () => act(() => drag.start(30, selectedPaths[0] === "folder" ? 45 : 15, 300, 50));
  try {
    overEditor = true;
    await render();
    drag.viewRef({ measureInWindow: (cb) => cb(0, 0, 200, 120) });
    await start();
    expect(drag.preview?.openPaths).toEqual(["note.md"]);
    expect(drag.preview?.target).toBeNull();
    await act(() => drag.finish(true));
    expect(opens).toEqual([["note.md"]]);
    expect(move).not.toHaveBeenCalled();
    await start();
    await act(() => {
      drag.finish(false);
      drag.finish(true);
    });
    await start();
    epoch++;
    await render();
    await act(() => drag.finish(true));
    expect(opens).toHaveLength(1);
    selectedPaths = ["folder"];
    await render();
    await start();
    await act(() => drag.finish(true));
    expect(opens).toHaveLength(1);
    selectedPaths = ["folder", "folder/nested.md"];
    await render();
    await start();
    await act(() => drag.finish(true));
    expect(opens).toEqual([["note.md"], ["folder/nested.md"]]);
    selectedPaths = ["note.md"];
    canMove = false;
    await render();
    await start();
    await act(() => drag.finish(true));
    expect(opens).toEqual([["note.md"], ["folder/nested.md"], ["note.md"]]);
    overEditor = false;
    await start();
    await act(() => drag.finish(true));
    expect(opens).toHaveLength(3);
  } finally {
    overEditor = false;
    await act(() => root.unmount());
    container.remove();
  }
});
