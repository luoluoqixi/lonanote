import type { EditorCommand, EditorCommandResult } from "@/assets/editor/src/bridge/protocol";
import { editorStore } from "@/stores/editor";

type CommandProvider = (command: EditorCommand) => Promise<EditorCommandResult>;

const providers = new Map<string, CommandProvider>();

export const editorCommandCoordinator = {
  registerProvider: (editorId: string, provider: CommandProvider): (() => void) => {
    providers.set(editorId, provider);
    return () => {
      if (providers.get(editorId) === provider) providers.delete(editorId);
    };
  },
  execute: async (editorId: string, command: EditorCommand): Promise<EditorCommandResult> => {
    const state = editorStore.getState();
    const view = state.editorsById[editorId];
    const document = view ? state.documentsById[view.documentId] : null;
    const isNavigationCommand = command.type === "navigation.scrollToAnchor";
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
    return provider(command);
  },
};
