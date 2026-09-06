import type {
  EditorPreferences,
  EditorStateSnapshot,
  EditorSurfaceCapabilities,
} from "@/assets/editor/src/bridge/protocol";

export type { EditorPreferences, EditorStateSnapshot, EditorSurfaceCapabilities };

export type EditorBridgeState = "detached" | "loading" | "handshaking" | "ready" | "failed";

export type EditorViewSession = {
  editorId: string;
  documentId: string;
  groupId: string | null;
  readOnly: boolean;
  previewMode: boolean;
  preferenceOverrides: Partial<EditorPreferences>;
  bridgeState: EditorBridgeState;
  bridgeGeneration: number;
  surfaceCapabilities: EditorSurfaceCapabilities | null;
  editorState: EditorStateSnapshot;
  /** 跨文档 Markdown 锚点在目标 surface ready 后消费。 */
  pendingAnchor: string | null;
};

export const EMPTY_EDITOR_STATE_SNAPSHOT: EditorStateSnapshot = {
  revision: 0,
  focused: false,
  composing: false,
  canUndo: false,
  canRedo: false,
  selectionEmpty: true,
  activeMarks: [],
  block: { type: "paragraph" },
  list: "none",
  row: 1,
  column: 1,
  characterCount: 0,
};
