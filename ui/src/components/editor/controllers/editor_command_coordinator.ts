import type {
  EditorCommand,
  EditorCommandResult,
  EditorMenuSnapshot,
} from "@/assets/editor/src/bridge/protocol";
import { editorStore } from "@/stores/editor";

import { editorWindowRuntime } from "./editor_window_runtime";

type CommandProvider = (
  command: EditorCommand,
  snapshot?: EditorMenuSnapshot,
) => Promise<EditorCommandResult>;

const providers = new Map<string, CommandProvider>();

export const editorCommandCoordinator = {
  prepareMenuEdit: async (editorId: string): Promise<void> => {
    if (editorStore.getState().activeEditorId !== editorId) return;
    if (editorWindowRuntime.isRemote()) {
      const { editorWindowService } = await import("./editor_window_service");
      await editorWindowService.requestLease(editorId);
    } else {
      const { editorInputLeaseCoordinator } = await import("./editor_input_lease_coordinator");
      await editorInputLeaseCoordinator.requestLease(editorId);
    }
  },
  executeMenuCommand: async (editorId: string, command: EditorCommand): Promise<void> => {
    await editorCommandCoordinator.prepareMenuEdit(editorId);
    if (editorStore.getState().activeEditorId !== editorId) return;
    await editorCommandCoordinator.execute(editorId, command);
    await editorCommandCoordinator.focusIfActive(editorId);
  },
  focusIfActive: async (editorId: string): Promise<void> => {
    if (editorStore.getState().activeEditorId !== editorId) return;
    await editorCommandCoordinator.execute(editorId, {
      type: "editor.focus",
      preserveSelection: true,
    });
  },
  registerProvider: (editorId: string, provider: CommandProvider): (() => void) => {
    providers.set(editorId, provider);
    return () => {
      if (providers.get(editorId) === provider) providers.delete(editorId);
    };
  },
  execute: async (
    editorId: string,
    command: EditorCommand,
    snapshot?: EditorMenuSnapshot,
  ): Promise<EditorCommandResult> => {
    const state = editorStore.getState();
    const view = state.editorsById[editorId];
    const document = view ? state.documentsById[view.documentId] : null;
    const isNavigationCommand = [
      "navigation.scrollToAnchor",
      "selection.selectAll",
      "selection.capture",
      "editor.focus",
      "editor.blur",
    ].includes(command.type);
    if (
      !view ||
      !document ||
      (!isNavigationCommand &&
        (view.readOnly || view.previewMode || document.editOwnerEditorId !== editorId))
    ) {
      throw new Error("当前 Editor 未持有输入 lease");
    }
    const provider = providers.get(editorId);
    if (!provider) throw new Error("Editor surface 当前不可执行命令");
    return provider(command, snapshot);
  },
};
