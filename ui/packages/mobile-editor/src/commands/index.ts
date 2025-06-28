import { changeColorMode } from './changeColorMode';
import { changePreviewMode } from './changePreviewMode';
import { changeSourceMode } from './changeSourceMode';

export const invokeCommand = async (command: string, data: any): Promise<any> => {
  if (command === 'change_preview_mode') {
    await changePreviewMode(data);
  } else if (command === 'change_source_mode') {
    await changeSourceMode(data);
  } else if (command === 'change_color_mode') {
    await changeColorMode(data);
  } else {
    console.log('command::', command, data);
  }
};
