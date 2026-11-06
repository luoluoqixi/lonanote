import { afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useState } from "react";

const win = new Window();
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "Event", "MouseEvent"]) {
  globalThis[key] = key === "window" ? win : win[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const flatten = (style) =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style;
function View({ children, style, className, role }) {
  return (
    <div role={role} className={className} style={flatten(style)}>
      {children}
    </div>
  );
}
function Pressable({ children, style, onPress, accessibilityLabel, disabled }) {
  return (
    <button
      aria-label={accessibilityLabel}
      disabled={disabled}
      style={flatten(typeof style === "function" ? style({ pressed: false }) : style)}
      onClick={onPress}
    >
      {children}
    </button>
  );
}
mock.module("react-native", () => ({
  View,
  Pressable,
  StyleSheet: { create: (styles) => styles },
  useWindowDimensions: () => ({ width: 1000 }),
}));
function Dropdown({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}>更多</button>
      {open && children}
    </>
  );
}
Dropdown.Content = ({ children, style }) => (
  <div role="menu" style={style}>
    {children}
  </div>
);
// 菜单项与 Web primitive 一样直接消费 DOM style，避免 mock 自动 flatten 掩盖崩溃。
Dropdown.Item = ({ children, style, onPress, accessibilityLabel }) => {
  expect(Array.isArray(style)).toBe(false);
  return (
    <button role="menuitem" aria-label={accessibilityLabel} style={style} onClick={onPress}>
      {children}
    </button>
  );
};
mock.module("rn-ui-kit", () => ({
  Dropdown,
  Text: ({ children }) => <span>{children}</span>,
  Button: ({ children, onPress, ...props }) => (
    <button aria-label={props["aria-label"]} onClick={onPress}>
      {children}
    </button>
  ),
  useUiTheme: () => ({ primary: "blue", accent: "gray" }),
}));
mock.module("lucide-react-native", () => ({ X: () => <span>×</span> }));
mock.module("../src/components/files/file_path_tooltip", () => ({
  FilePathTooltip: ({ children }) => children,
}));
mock.module("../src/components/workspaces/workspace_select/workspace_location_sheet", () => ({
  WorkspaceLocationSheet: () => null,
}));
mock.module("../src/hooks/ui", () => ({ useToast: () => ({ toast: { error: mock() } }) }));
mock.module("../src/hooks/workspace/use_workspace_catalog_revision", () => ({
  useWorkspaceCatalogRevision: () => ({ revision: 0 }),
}));
mock.module("../src/hooks/workspace/use_workspace_location", () => ({
  useWorkspaceLocation: () => ({ item: null, isWorking: false }),
}));
const open = mock(async () => {});
mock.module("../src/hooks/workspace/use_workspace_open_actions", () => ({
  useWorkspaceOpenActions: () => ({ busy: false, openWorkspace: open }),
}));
let records = Array.from({ length: 11 }, (_, index) => ({
  id: `${index}`,
  displayName: `工作区${index}`,
  lastOpenedAt: 100 - index,
}));
const clearHistory = mock(async (id) => {
  records = records.filter((item) => item.id !== id);
});
mock.module("../src/api/commands/workspace", () => ({
  workspace: {
    list: async () => records,
    nativeRootPath: async (id) => `C:/notes/${id}`,
    clearHistory,
  },
}));
const { RecentWorkspaces } = await import("../src/components/workspaces/recent_workspaces");
let root;
afterEach(async () => {
  await act(() => root?.unmount());
  document.body.replaceChildren();
});

test("历史显示路径，更多菜单可渲染，移除按钮与打开按钮共用整行 hover 且不触发打开", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<RecentWorkspaces />);
  });
  expect(container.textContent).toContain("C:/notes/0");
  expect(container.textContent).not.toContain("路径不可用");
  const remove = container.querySelector('[aria-label="从历史记录中移除 工作区0"]');
  expect(remove.parentElement.className).toContain("hover:bg-accent");
  expect(remove.parentElement.querySelector('[aria-label="打开工作区 工作区0"]')).not.toBeNull();
  await act(() =>
    [...container.querySelectorAll("button")].find((node) => node.textContent === "更多").click(),
  );
  expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(11);
  const menuRemove = container.querySelector(
    '[role="menu"] [aria-label="从历史记录中移除 工作区0"]',
  );
  expect(menuRemove.parentElement.className).toContain("hover:bg-accent");
  await act(async () => {
    menuRemove.click();
  });
  expect(clearHistory).toHaveBeenCalledWith("0");
  expect(open).not.toHaveBeenCalled();
});
