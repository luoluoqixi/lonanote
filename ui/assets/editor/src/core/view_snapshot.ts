import { Transaction } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";

import type { EditorViewSnapshot } from "../bridge/protocol";

export function captureEditorViewState(
  view: EditorView,
  scroller: HTMLElement,
): EditorViewSnapshot {
  const { anchor, head } = view.state.selection.main;
  return { selection: { anchor, head }, scrollTop: Math.max(0, scroller.scrollTop) };
}
/** 恢复视图位置只发选区事务，不调用focus；布局测量后可再次恢复滚动。 */
export function restoreEditorViewState(
  view: EditorView,
  scroller: HTMLElement,
  snapshot: EditorViewSnapshot,
): void {
  const clamp = (position: number) =>
    Math.max(
      0,
      Math.min(view.state.doc.length, Number.isFinite(position) ? Math.trunc(position) : 0),
    );
  view.dispatch({
    selection: { anchor: clamp(snapshot.selection.anchor), head: clamp(snapshot.selection.head) },
    annotations: Transaction.addToHistory.of(false),
  });
  restoreEditorScroll(scroller, snapshot.scrollTop);
}
export function restoreEditorScroll(scroller: HTMLElement, scrollTop: number): void {
  scroller.scrollTop = Math.max(
    0,
    Math.min(
      Math.max(scroller.scrollHeight - scroller.clientHeight, 0),
      Number.isFinite(scrollTop) ? scrollTop : 0,
    ),
  );
}
