import type {
  EditorCommand,
  EditorCommandResult,
  EditorMenuSnapshot,
} from "@/assets/editor/src/bridge/protocol";
import { editorStore } from "@/stores/editor";

type CommandProvider = (
  command: EditorCommand,
  snapshot?: EditorMenuSnapshot,
) => Promise<EditorCommandResult>;

const providers = new Map<string, CommandProvider>();

export const editorCommandCoordinator = {
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
