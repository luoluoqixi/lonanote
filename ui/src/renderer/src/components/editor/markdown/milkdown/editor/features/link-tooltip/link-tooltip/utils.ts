import type { Ctx } from '@milkdown/ctx';
import { linkSchema } from '@milkdown/preset-commonmark';
import type { Mark, Node } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';

import { linkPreviewTooltip } from './tooltips';

export function findMarkPosition(mark: Mark, node: Node, doc: Node, from: number, to: number) {
  let markPos = { start: -1, end: -1 };
  doc.nodesBetween(from, to, (n, pos) => {
    // stop recursive finding if result is found
    if (markPos.start > -1) return false;

    if (markPos.start === -1 && mark.isInSet(n.marks) && node === n) {
      markPos = {
        start: pos,
        end: pos + Math.max(n.textContent.length, 1),
      };
    }

    return undefined;
  });

  return markPos;
}

export function shouldShowPreviewWhenHover(ctx: Ctx, view: EditorView, event: MouseEvent) {
  const $pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!$pos) return;

  const { pos } = $pos;
  const node = view.state.doc.nodeAt(pos);

  if (!node) return;

  const mark = node.marks.find((mark) => mark.type === linkSchema.mark.type(ctx));
  if (!mark) return;

  const key = linkPreviewTooltip.pluginKey();
  if (!key) return;

  return { show: true, pos, node, mark };
}

export function isPosInType(view: EditorView, pos: number, type: string): boolean {
  const node = view.state.doc.nodeAt(pos);
  if (!node) return false;
  return node.marks.some((mark) => mark.type.name === type);
}

export function isCursorInType(view: EditorView, type: string): boolean {
  const { state } = view;
  const { from, to } = state.selection;
  if (from !== to) return false;
  return isPosInType(view, from, type);
}

export function isSelectionType(view: EditorView, type: string): boolean {
  const { state } = view;
  const { from, to } = state.selection;
  return isPosInType(view, from, type) || isPosInType(view, to, type);
}
