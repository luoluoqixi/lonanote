import type {
  EditorInitializePayload,
  EditorInsets,
  EditorPlatform,
  EditorResourceContext,
  EditorSemanticColors,
} from "@/assets/editor/src/bridge/protocol";
import type { DocumentModel, EditorViewSession } from "@/stores/editor";

type EditorBridgeRuntimeInput = {
  platform: EditorPlatform;
  colorScheme: "light" | "dark";
  colors: EditorSemanticColors;
  safeAreaInsets: EditorInsets;
  contentInsets: EditorInsets;
  locale: string;
  pixelRatio: number;
  fontScale: number;
  reducedMotion: boolean;
};

export function createUnavailableEditorResourceContext(
  document: DocumentModel,
): Extract<EditorResourceContext, { available: false }> {
  if (document.ref.kind === "untitled") {
    return { available: false, reason: "untitled" };
  }
  return { available: false, reason: "providerUnavailable" };
}

export function createEditorInitializePayload(
  document: DocumentModel,
  view: EditorViewSession,
  runtime: EditorBridgeRuntimeInput,
  preferences: EditorInitializePayload["preferences"],
  resources: EditorResourceContext,
): EditorInitializePayload {
  const workspacePath = document.ref.kind === "workspaceFile" ? document.ref.filePath : null;
  const fileName = document.ref.kind === "untitled" ? null : document.title;

  return {
    runtime: {
      revision: 1,
      ...runtime,
    },
    document: {
      text: document.draft,
      revision: document.draftRevision,
      displayName: document.title,
      fileName,
      workspacePath,
      readOnly: view.readOnly || view.previewMode,
      inputEnabled: document.editOwnerEditorId === view.editorId,
    },
    preferences,
    resources,
  };
}
