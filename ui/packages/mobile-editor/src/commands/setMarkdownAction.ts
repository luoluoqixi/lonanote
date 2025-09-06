import { commands } from 'purrmd';

export const setMarkdownAction = (action: string | null) => {
  if (action != null && typeof action === 'string') {
    if (window.editor) {
      const view = window.editor.editor;
      if (action === 'bold') {
        commands.toggleStrongCommand(view);
      } else if (action === 'italic') {
        commands.toggleItalicCommand(view);
      } else if (action === 'strikethrough') {
        commands.toggleStrikethroughCommand(view);
      } else if (action === 'highlight') {
        commands.toggleHighlightCommand(view);
      } else if (action === 'inlineCode') {
        commands.toggleInlineCodeCommand(view);
      }
    }
  }
};
