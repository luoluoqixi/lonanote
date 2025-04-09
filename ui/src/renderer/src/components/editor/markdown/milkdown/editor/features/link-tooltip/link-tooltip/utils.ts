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

export function shouldShowPreviewWhenHover(
  view: EditorView,
  event: MouseEvent,
  type: string | string[],
) {
  const $pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!$pos) return;

  const key = linkPreviewTooltip.pluginKey();
  if (!key) return;

  const { pos } = $pos;
  const node = view.state.doc.nodeAt(pos);
  if (!node) return;

  const mark = getNodeMark(node, type);
  if (!mark) return;
  return { show: true, pos, node, mark };
}

export function isNodeMark(node: Node, type: string | string[]) {
  if (!node) return false;
  if (Array.isArray(type)) {
    const count = type.length;
    for (let i = 0; i < count; i++) {
      const t = type[i];
      if (node.marks.some((mark) => mark.type.name === t)) {
        return true;
      }
    }
    return false;
  }
  return node.marks.some((mark) => mark.type.name === type);
}

export function getNodeMark(node: Node, type: string | string[]) {
  if (!node) return null;
  if (Array.isArray(type)) {
    const count = type.length;
    for (let i = 0; i < count; i++) {
      const mark = node.marks.find((mark) => mark.type.name === type[i]);
      if (mark) {
        return mark;
      }
    }
    return null;
  }
  return node.marks.find((mark) => mark.type.name === type);
}

export function isPosInType(view: EditorView, pos: number, type: string | string[]): boolean {
  const node = view.state.doc.nodeAt(pos);
  if (!node) {
    return false;
  }
  return isNodeMark(node, type);
}

export function isCursorInType(view: EditorView, type: string | string[]): boolean {
  const { state } = view;
  const { from, to } = state.selection;
  if (from !== to) return false;
  return isPosInType(view, from, type);
}

export function isSelectionType(view: EditorView, type: string | string[]): boolean {
  const { state } = view;
  const { from, to } = state.selection;
  return isPosInType(view, from, type) || isPosInType(view, to, type);
}

export const linkType = ['link'];
