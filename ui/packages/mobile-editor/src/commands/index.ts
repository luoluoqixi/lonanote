import { changeColorMode } from './changeColorMode';
import { changePreviewMode } from './changePreviewMode';
import { changeSourceMode } from './changeSourceMode';
import { canRedo, canUndo, redo, undo } from './undoRedo';

export const invokeCommand = (command: string, data: any): any => {
  if (command === 'change_preview_mode') {
    changePreviewMode(data);
  } else if (command === 'change_source_mode') {
    changeSourceMode(data);
  } else if (command === 'change_color_mode') {
    changeColorMode(data);
  } else if (command === 'canUndo') {
    return canUndo();
  } else if (command === 'canRedo') {
    return canRedo();
  } else if (command === 'undo') {
    undo();
  } else if (command === 'redo') {
    redo();
  } else {
    console.log('command::', command, data);
  }
};
