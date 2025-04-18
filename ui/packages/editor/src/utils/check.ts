import type { Selection } from '@milkdown/kit/prose/state';
import type { Mark, MarkType, Node as ProseNode } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';

export function isInCodeBlock(selection: Selection) {
  const type = selection.$from.parent.type;
  return type.name === 'code_block';
}

export function isInList(selection: Selection) {
  const type = selection.$from.node(selection.$from.depth - 1)?.type;
  return type?.name === 'list_item';
}

export function isNodeMark(node: ProseNode, type: MarkType | ((mark: Mark) => boolean)) {
  if (!node) return false;
  const isFunc = typeof type === 'function';
  return node.marks.some((mark) => {
    if (isFunc) return type(mark);
    return mark.type === type;
  });
}

export function getNodeMark(node: ProseNode, type: MarkType | ((mark: Mark) => boolean)) {
  if (!node) return null;
  const isFunc = typeof type === 'function';
  return node.marks.find((mark) => {
    if (isFunc) return type(mark);
    return mark.type === type;
  });
}

export function getPosNodeInType(
  view: EditorView,
  pos: number,
  type: MarkType | ((mark: Mark) => boolean),
): ProseNode | null {
  const node = view.state.doc.nodeAt(pos);
  if (!node) {
    return null;
  }
  if (isNodeMark(node, type)) {
    return node;
  }
  return null;
}

export function getCursorNodeInType(
  view: EditorView,
  type: MarkType | ((mark: Mark) => boolean),
): ProseNode | null {
  const { state } = view;
  const { from, to } = state.selection;
  if (from !== to) return null;
  return getPosNodeInType(view, from, type);
}

export function isPosInType(
  view: EditorView,
  pos: number,
  type: MarkType | ((mark: Mark) => boolean),
) {
  return getPosNodeInType(view, pos, type) !== null;
}

export function isCursorInType(
  view: EditorView,
  type: MarkType | ((mark: Mark) => boolean),
): boolean {
  return getCursorNodeInType(view, type) !== null;
}

export function isSelectionType(
  view: EditorView,
  type: MarkType | ((mark: Mark) => boolean),
): boolean {
  const { state } = view;
  const { from, to } = state.selection;
  return isPosInType(view, from, type) || isPosInType(view, to, type);
}
