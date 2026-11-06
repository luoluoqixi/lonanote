import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window();
for (const key of ["window", "document", "HTMLElement", "Element", "Node", "Event"]) {
  globalThis[key] = key === "window" ? win : win[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const createEntry = mock(async () => ({ succeededPaths: ["folder/test.md"] }));
const list = mock(async () => [{ path: "folder/未命名笔记.md" }]);
mock.module("../src/api/commands/workspace", () => ({ workspaceFile: { list } }));
mock.module("../src/hooks/workspace/use_workspace_file_actions", () => ({
  useWorkspaceFileActions: () => ({ createEntry }),
}));
mock.module("../src/hooks/ui", () => ({
  useToast: () => ({ toast: { error: mock(), success: mock() } }),
}));
mock.module("../src/api/common", () => ({
  ensureNewNoteFileExtension: (name) => (name.endsWith(".md") ? name : `${name}.md`),
}));
const { useWorkspaceEntryCreation } =
  await import("../src/hooks/workspace/use_workspace_entry_creation");
let creation;
function Probe({ workspaceId }) {
  creation = useWorkspaceEntryCreation(workspaceId);
  return null;
}

test("命名弹窗打开或取消不创建，确认后才按输入名称和目标目录创建", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(() => root.render(<Probe workspaceId="a" />));
    await act(() => creation.open("note", "folder"));
    expect(creation.sheetProps).toMatchObject({
      open: true,
      name: "未命名笔记 2.md",
      parentPath: "folder",
    });
    expect(createEntry).not.toHaveBeenCalled();
    await act(() => creation.sheetProps.onOpenChange(false));
    expect(createEntry).not.toHaveBeenCalled();
    await act(() => creation.open("note", "folder"));
    await act(() => creation.sheetProps.onNameChange("test"));
    await act(async () => {
      creation.sheetProps.onSubmit();
    });
    expect(createEntry).toHaveBeenCalledWith({
      workspaceId: "a",
      parentPath: "folder",
      name: "test.md",
      kind: "note",
    });
    expect(creation.sheetProps.open).toBe(false);
    await act(() => creation.open("directory", "folder"));
    expect(creation.sheetProps.name).toBe("新建文件夹");
    await act(() => creation.sheetProps.onNameChange("子目录"));
    await act(async () => {
      creation.sheetProps.onSubmit();
    });
    expect(createEntry).toHaveBeenLastCalledWith({
      workspaceId: "a",
      parentPath: "folder",
      name: "子目录",
      kind: "directory",
    });
    let resolveList;
    list.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        }),
    );
    let opening;
    await act(() => {
      opening = creation.open("note", "folder");
    });
    await act(() => root.render(<Probe workspaceId="b" />));
    await act(async () => {
      resolveList([]);
      await opening;
    });
    expect(creation.sheetProps.open).toBe(false);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
});
