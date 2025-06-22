import type { Command, Transaction } from '@milkdown/kit/prose/state';

export interface SlashMenuItem {
  label: string;
  icon: string;
}

export function clearRange(tr: Transaction) {
  const { $from, $to } = tr.selection;
  const { pos: from } = $from;
  const { pos: to } = $to;
  tr = tr.deleteRange(from - $from.node().content.size, to);
  return tr;
}

export function clearContentAndInsertText(text: string): Command {
  return (state, dispatch) => {
    const tr = clearRange(state.tr);
    if (!tr) return false;
    const { $from, $to } = tr.selection;
    const { pos: from } = $from;
    const { pos: to } = $to;
    if (dispatch) dispatch(tr.insertText(text, from, to).scrollIntoView());
    return true;
  };
}
