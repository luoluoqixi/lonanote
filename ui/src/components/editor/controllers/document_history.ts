import type { EditorDocumentChangedPayload } from "@/assets/editor/src/bridge/protocol";
import {
  type TextChange,
  applyTextChange,
  textChange,
} from "@/assets/editor/src/bridge/text_change";
import { editorStore } from "@/stores/editor";

export {
  textChange,
  applyTextChange,
  mapTextPosition,
} from "@/assets/editor/src/bridge/text_change";
export const DOCUMENT_HISTORY_MAX_ENTRIES = 1000;
export const DOCUMENT_HISTORY_MAX_TEXT_BYTES = 8 * 1024 * 1024;
type HistoryEntry = { forward: TextChange; inverse: TextChange };
export type DocumentHistorySnapshot = {
  text: string;
  revision: number;
  undo: HistoryEntry[];
  redo: HistoryEntry[];
};
/** owner 唯一历史；快照不恢复旧 lease，renderer 重连必须重新签发。 */
export class DocumentHistory {
  text: string;
  revision: number;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private accepted = new Map<number, string>();
  private mergeUntil = 0;
  private owner: string | null = null;
  private token: string | null = null;
  private sequence = 0;
  constructor(text: string, revision: number) {
    this.text = text;
    this.revision = revision;
  }
  /** 两栈合计最多1000条、约8MiB UTF-16变化文本；保留最近单条超大事务。 */
  private pruneHistory(): void {
    const bytes = (entry: HistoryEntry) =>
      (entry.forward.insert.length + entry.inverse.insert.length) * 2;
    let size = [...this.undoStack, ...this.redoStack].reduce((sum, entry) => sum + bytes(entry), 0);
    while (
      this.undoStack.length + this.redoStack.length > 1 &&
      (this.undoStack.length + this.redoStack.length > DOCUMENT_HISTORY_MAX_ENTRIES ||
        size > DOCUMENT_HISTORY_MAX_TEXT_BYTES)
    ) {
      const removed =
        this.undoStack.length > 1
          ? this.undoStack.shift()
          : this.redoStack.length
            ? this.redoStack.shift()
            : this.undoStack.shift();
      if (removed) size -= bytes(removed);
    }
  }
  grant(owner: string, token: string) {
    this.owner = owner;
    this.token = token;
    this.sequence = 0;
    this.accepted.clear();
    this.mergeUntil = 0;
  }
  submit(
    owner: string,
    token: string,
    base: number,
    sequence: number,
    change: TextChange,
    boundary = false,
  ): boolean {
    if (owner !== this.owner || token !== this.token) return false;
    const key = JSON.stringify({ base, change });
    if (sequence <= this.sequence) return this.accepted.get(sequence) === key;
    if (base !== this.revision) return false;
    let next: string;
    try {
      next = applyTextChange(this.text, change);
    } catch {
      return false;
    }
    const previous = this.undoStack.at(-1);
    if (
      !boundary &&
      Date.now() < this.mergeUntil &&
      previous &&
      change.from === change.to &&
      previous.forward.from === previous.forward.to &&
      change.from === previous.forward.from + previous.forward.insert.length
    ) {
      previous.forward.insert += change.insert;
      previous.inverse.to += change.insert.length;
    } else this.undoStack.push({ forward: { ...change }, inverse: textChange(next, this.text) });
    this.mergeUntil = boundary ? 0 : Date.now() + 500;
    this.accepted.set(sequence, key);
    if (this.accepted.size > 256) this.accepted.delete(this.accepted.keys().next().value!);
    this.redoStack = [];
    this.pruneHistory();
    this.text = next;
    this.sequence = sequence;
    this.revision++;
    return true;
  }
  capture(text: string): void {
    if (text === this.text) return;
    this.undoStack.push({
      forward: textChange(this.text, text),
      inverse: textChange(text, this.text),
    });
    this.text = text;
    this.revision++;
    this.redoStack = [];
    this.pruneHistory();
  }
  undo(): string {
    this.mergeUntil = 0;
    const e = this.undoStack.pop();
    if (e) {
      this.text = applyTextChange(this.text, e.inverse);
      this.redoStack.push(e);
      this.revision++;
    }
    return this.text;
  }
  redo(): string {
    this.mergeUntil = 0;
    const e = this.redoStack.pop();
    if (e) {
      this.text = applyTextChange(this.text, e.forward);
      this.undoStack.push(e);
      this.revision++;
    }
    return this.text;
  }
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  snapshot(): DocumentHistorySnapshot {
    return structuredClone({
      text: this.text,
      revision: this.revision,
      undo: this.undoStack,
      redo: this.redoStack,
    });
  }
  static restore(s: DocumentHistorySnapshot): DocumentHistory {
    const h = new DocumentHistory(s.text, s.revision);
    h.undoStack = structuredClone(s.undo);
    h.redoStack = structuredClone(s.redo);
    h.pruneHistory();
    return h;
  }
}

const historySelections = new Map<string, { revision: number; position: number }>();
const histories = new Map<string, DocumentHistory>();
const leases = new Map<string, { editorId: string; token: string }>();
function historyFor(documentId: string): DocumentHistory | null {
  const d = editorStore.getState().documentsById[documentId];
  if (!d) return null;
  let h = histories.get(documentId);
  if (!h || h.text !== d.draft || h.revision !== d.draftRevision) {
    h = new DocumentHistory(d.draft, d.draftRevision);
    histories.set(documentId, h);
  }
  return h;
}
export const documentHistoryService = {
  grant(documentId: string, editorId: string, token: string) {
    const h = historyFor(documentId);
    h?.grant(editorId, token);
    leases.set(documentId, { editorId, token });
  },
  submit(documentId: string, editorId: string, payload: EditorDocumentChangedPayload): boolean {
    const d = editorStore.getState().documentsById[documentId];
    const h = historyFor(documentId);
    const lease = leases.get(documentId);
    if (
      !d ||
      !h ||
      !lease ||
      d.editOwnerEditorId !== editorId ||
      payload.identityRevision !== d.identityRevision ||
      payload.leaseToken !== lease.token
    )
      return false;
    try {
      if (
        payload.baseRevision === h.revision &&
        payload.text !== undefined &&
        payload.change &&
        applyTextChange(h.text, payload.change) !== payload.text
      )
        return false;
    } catch {
      return false;
    }
    const revision = h.revision;
    if (
      !h.submit(
        editorId,
        lease.token,
        payload.baseRevision,
        payload.localSequence,
        payload.change ?? textChange(h.text, payload.text ?? h.text),
        payload.historyBoundary,
      )
    )
      return false;
    if (h.revision !== revision) editorStore.getState().setDocumentDraft(documentId, h.text);
    return true;
  },
  captureInitial(documentId: string, editorId: string, text: string) {
    const state = editorStore.getState(),
      document = state.documentsById[documentId],
      view = state.editorsById[editorId];
    if (
      !document ||
      document.editOwnerEditorId ||
      !document.attachedEditorIds.includes(editorId) ||
      view?.documentId !== documentId ||
      view.bridgeState === "ready"
    )
      throw new Error("初始化capture不满足无持有者条件");
    const h = historyFor(documentId);
    if (h && text !== document.draft) {
      h.capture(text);
      state.setDocumentDraft(documentId, text);
    }
  },
  capture(documentId: string, editorId: string, text: string) {
    const d = editorStore.getState().documentsById[documentId];
    const h = historyFor(documentId);
    if (!d || !h || d.editOwnerEditorId !== editorId) throw new Error("capture持有者已改变");
    if (text !== d.draft) {
      h.capture(text);
      editorStore.getState().setDocumentDraft(documentId, text);
    }
  },
  history(
    documentId: string,
    direction: "undo" | "redo",
    editorId = editorStore.getState().activeEditorId,
  ) {
    const state = editorStore.getState();
    const document = state.documentsById[documentId];
    const view = editorId ? state.editorsById[editorId] : null;
    if (!view || view.readOnly || view.previewMode || document?.editOwnerEditorId !== editorId)
      return;
    const h = historyFor(documentId);
    if (!h) return;
    const before = h.revision,
      previousText = h.text;
    const text = h[direction]();
    if (h.revision !== before) {
      const change = textChange(previousText, text);
      if (editorId)
        historySelections.set(editorId, {
          revision: h.revision,
          position: change.from + change.insert.length,
        });
      editorStore.getState().setDocumentDraft(documentId, text);
    }
  },
  selectionFor(editorId: string, revision: number) {
    const selection = historySelections.get(editorId);
    return selection?.revision === revision ? selection.position : undefined;
  },
  status(documentId: string) {
    const h = historyFor(documentId);
    return { canUndo: Boolean(h?.canUndo), canRedo: Boolean(h?.canRedo) };
  },
  snapshot(documentId: string) {
    return historyFor(documentId)?.snapshot() ?? null;
  },
  restore(documentId: string, snapshot: DocumentHistorySnapshot) {
    const d = editorStore.getState().documentsById[documentId];
    if (!d || d.draft !== snapshot.text || d.draftRevision !== snapshot.revision)
      throw new Error("history checkpoint 与文档不一致");
    histories.set(documentId, DocumentHistory.restore(snapshot));
    leases.delete(documentId);
  },
};

editorStore.subscribe((state) => {
  for (const id of histories.keys())
    if (!state.documentsById[id]) {
      histories.delete(id);
      leases.delete(id);
    }
  for (const id of historySelections.keys())
    if (!state.editorsById[id]) historySelections.delete(id);
});
