import { commands } from 'purrmd';

const actions = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'text',
  'quote',
  'divider',
  'bulletList',
  'orderedList',
  'taskList',
  'link',
  'imageBlock',
  'codeBlock',
  'table',
] as const;

export const addMarkdownAction = (action: number | null) => {
  if (action != null && typeof action === 'number') {
    if (action < 0 || action >= actions.length) {
      return;
    }
    if (window.editor) {
      const view = window.editor.editor;
      const actionName = actions[action];
      if (actionName === 'h1') {
        commands.insertHeading1(view);
      } else if (actionName === 'h2') {
        commands.insertHeading2(view);
      } else if (actionName === 'h3') {
        commands.insertHeading3(view);
      } else if (actionName === 'h4') {
        commands.insertHeading4(view);
      } else if (actionName === 'h5') {
        commands.insertHeading5(view);
      } else if (actionName === 'h6') {
        commands.insertHeading6(view);
      } else if (actionName === 'text') {
        commands.insertText(view);
      } else if (actionName === 'quote') {
        commands.insertBlockquote(view);
      } else if (actionName === 'divider') {
        commands.insertHorizontalRule(view);
      } else if (actionName === 'bulletList') {
        commands.insertUnorderedList(view);
      } else if (actionName === 'orderedList') {
        commands.insertOrderedList(view);
      } else if (actionName === 'taskList') {
        commands.insertTaskList(view);
      } else if (actionName === 'link') {
        commands.insertLink(view);
      } else if (actionName === 'imageBlock') {
        commands.insertImage(view);
      } else if (actionName === 'codeBlock') {
        commands.insertCodeBlock(view);
      } else if (actionName === 'table') {
        commands.insertTable(view);
      }
    }
  }
};
