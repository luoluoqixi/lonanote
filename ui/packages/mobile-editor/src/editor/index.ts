import { editorViewCtx } from '@milkdown/core';
import { TextSelection } from '@milkdown/kit/prose/state';

import { create } from './markdown/MarkdownEditor';

export const createEditor = async () => {
  const root = document.getElementById('root')!;
  const editor = create(root);

  document.body.addEventListener('click', (e) => {
    if (editor == null || editor.editor == null) return;
    if (e.target !== document.body) return;
    // 手指点在 body 上时自动聚焦
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const pos = view.state.doc.content.size;
      const { state } = view;
      const selection = TextSelection.create(state.doc, pos);
      view.focus();
      view.dispatch(state.tr.setSelection(selection));
    });
  });
};
