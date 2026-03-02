// import { editorViewCtx } from '@milkdown/core';
// import { TextSelection } from '@milkdown/kit/prose/state';

// export const saveCursorSelection = () => {
//   if (window.editor) {
//     window.editor.editor.action((ctx) => {
//       const view = ctx.get(editorViewCtx);
//       const selection = view.state.selection;
//       if (selection) {
//         (window as any).editorCursorSelection = {
//           anchor: selection.anchor,
//           head: selection.head,
//         };
//       }
//     });
//   }
// };

// export const restoreCursorSelection = () => {
//   if (window.editor) {
//     window.editor.editor.action((ctx) => {
//       const view = ctx.get(editorViewCtx);
//       const selection = (window as any).editorCursorSelection;
//       if (selection) {
//         (window as any).editorCursorSelection = null;
//         const s = TextSelection.create(view.state.doc, selection.anchor, selection.head);
//         const tr = view.state.tr.setSelection(s);
//         view.dispatch(tr);
//         view.focus();
//       }
//     });
//   }
// };
