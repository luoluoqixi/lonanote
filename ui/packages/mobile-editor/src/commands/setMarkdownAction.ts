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
      } else if (action === 'h1') {
        commands.setHeading1Command(view);
      } else if (action === 'h2') {
        commands.setHeading2Command(view);
      } else if (action === 'h3') {
        commands.setHeading3Command(view);
      } else if (action === 'h4') {
        commands.setHeading4Command(view);
      } else if (action === 'h5') {
        commands.setHeading5Command(view);
      } else if (action === 'h6') {
        commands.setHeading6Command(view);
      } else if (action === 'text') {
        commands.setParagraphCommand(view);
      } else if (action === 'blockquote') {
        commands.setBlockquoteCommand(view);
      } else if (action === 'unorderedList') {
        commands.toggleUnorderedListCommand(view);
      } else if (action === 'orderedList') {
        commands.toggleOrderedListCommand(view);
      } else if (action === 'taskList') {
        commands.toggleTaskListCommand(view);
      }
    }
  }
};
