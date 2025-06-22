import { invokeCommand } from './commands';
import { config } from './config';
import { createEditor, getContent } from './editor';
import './styles/index.scss';
import './theme';
import './utils';

const initEditor = async (fileName: string, sourceMode: boolean, content: string) => {
  window.sourceMode = sourceMode;
  window.fileName = fileName;
  window.fileContent = content;
  if (window.previewMode == null) {
    window.previewMode = false;
  }
  console.log('init editor');
  await createEditor(fileName, sourceMode, content);
  console.log('init editor finish');
};

const init = () => {
  window.initEditor = initEditor;
  window.invokeCommand = invokeCommand;
  window.getContent = getContent;
  // window.EditorBridge.postMessage('');
  if (!config.isFlutter) {
    initEditor('default.md', false, '');
  }
};

init();
