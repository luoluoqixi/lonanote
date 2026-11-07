import type { EditorInputEnabledPayload } from "../bridge/protocol";
import type { LonaEditor } from "./editor";

type InputSession = {
  editor: LonaEditor;
  documentReadOnly: boolean;
  inputEnabled: boolean;
  leaseToken?: string;
  identityRevision?: number;
};

export function applyEditorInputLease(
  session: InputSession,
  payload: EditorInputEnabledPayload,
  beforeApply: () => void = () => {},
): boolean {
  if (session.editor.editor.composing) return false;
  beforeApply();
  session.leaseToken = payload.leaseToken ?? session.leaseToken;
  session.identityRevision = payload.identityRevision ?? session.identityRevision;
  session.inputEnabled = payload.enabled;
  session.editor.setReadonly(session.documentReadOnly || !session.inputEnabled);
  // 权限与焦点分离：屏障恢复、远端 ready 和迟到申请都不能抢走用户焦点。
  return true;
}
