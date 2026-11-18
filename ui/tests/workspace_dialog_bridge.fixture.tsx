import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

import type {
  WorkspaceSelectAction,
  WorkspaceSelectViewModel,
  WorkspaceSelectViewSnapshot,
} from "../src/api/common/dialogs/workspace_select_model";

const dom = new Window();
globalThis.window = dom as unknown as Window;
globalThis.document = dom.document as unknown as Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const listeners = new Set<(event: { payload: unknown }) => void>();
const views: WorkspaceSelectViewSnapshot[] = [];
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isTauri: () => true }));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    listen: async (_event: string, listener: (event: { payload: unknown }) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  }),
}));
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (
    command: string,
    args: { requestId: string; data: WorkspaceSelectViewSnapshot },
  ) => {
    if (command !== "publish_dialog_view" || args.requestId !== "picker")
      throw new Error("无效的投影目标");
    views.push(args.data);
  },
}));
const { createRoot } = await import("react-dom/client");
const { useWorkspaceSelectDialogBridge } =
  await import("../src/hooks/workspace/use_workspace_select_dialog_bridge");

test("握手前不丢首帧，状态变更持续投影，动作保持所属工作台，关闭后不再接收", async () => {
  const actions: WorkspaceSelectAction[] = [];
  const model: WorkspaceSelectViewModel = {
    embedded: true,
    desktop: true,
    currentWorkspaceId: "workspace-b",
    supportsOpenFolder: true,
    groupMode: "date",
    sortValue: "modified-at-desc",
    workspaces: [],
    selectedWorkspaceIds: [],
    areAllWorkspacesSelected: false,
    isGroupModeDisabled: false,
    isOpeningFolder: false,
    isOpeningWorkspace: false,
    isScanningWorkspaces: false,
    isRefreshingWorkspaces: false,
    isWorkspaceSelectionMode: false,
    isDeletingWorkspace: false,
    isUpdatingWorkspace: false,
    isLoading: false,
    hasError: false,
    tracksNavigationBarScrollEdge: false,
    usesNativeIosHeader: false,
  };
  function Harness({ value }: { value: WorkspaceSelectViewModel }) {
    useWorkspaceSelectDialogBridge("picker", value, async (action) => {
      actions.push(action);
    });
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  const send = (data: WorkspaceSelectAction, requestId = "picker") => {
    for (const receive of listeners) receive({ payload: { requestId, data } });
  };
  await act(() => root.render(<Harness value={model} />));
  expect(views).toHaveLength(0);
  await act(() => {
    send({ type: "ready" });
  });
  expect(views[0].model.currentWorkspaceId).toBe("workspace-b");
  await act(() =>
    root.render(
      <Harness
        value={{ ...model, isWorkspaceSelectionMode: true, selectedWorkspaceIds: ["workspace-c"] }}
      />,
    ),
  );
  expect(views.at(-1)!.model.selectedWorkspaceIds).toEqual(["workspace-c"]);
  expect(views.at(-1)!.model.isWorkspaceSelectionMode).toBe(true);
  expect(views.at(-1)!.revision).toBeGreaterThan(views[0].revision);
  await act(() => {
    send({ type: "delete", workspaceId: "workspace-c" }, "another-picker");
    send({ type: "edit", workspaceId: "workspace-c" });
  });
  expect(actions).toEqual([{ type: "edit", workspaceId: "workspace-c" }]);
  await act(() => root.unmount());
  expect(listeners.size).toBe(0);
  send({ type: "delete", workspaceId: "workspace-c" });
  expect(actions).toHaveLength(1);
});
