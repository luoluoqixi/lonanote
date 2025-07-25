import { addMarkdownAction } from './addMarkdownAction';
import { changeColorMode } from './changeColorMode';
import { changePreviewMode } from './changePreviewMode';
import { changeSourceMode } from './changeSourceMode';
import { canRedo, canUndo, redo, undo } from './undoRedo';

// import { restoreCursorSelection, saveCursorSelection } from './cursorSelection';

export const invokeCommand = (command: string, data: any): any => {
  if (command === 'change_preview_mode') {
    changePreviewMode(data);
  } else if (command === 'change_source_mode') {
    changeSourceMode(data);
  } else if (command === 'change_color_mode') {
    changeColorMode(data);
  } else if (command === 'can_undo') {
    return canUndo();
  } else if (command === 'can_redo') {
    return canRedo();
  } else if (command === 'undo') {
    undo();
  } else if (command === 'redo') {
    redo();
  } else if (command === 'add_markdown_action') {
    addMarkdownAction(data);
  } else {
    console.log('command::', command, data);
  }

  // else if (command === 'save_cursor_selection') {
  //   saveCursorSelection();
  // } else if (command === 'restore_cursor_selection') {
  //   restoreCursorSelection();
  // }
};
