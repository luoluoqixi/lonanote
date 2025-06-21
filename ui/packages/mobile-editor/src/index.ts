import { createEditor } from './editor';
import './styles/index.scss';
import './theme';
import './utils';

const initEditor = async (content: string) => {
  console.log('init editor');
  await createEditor(content);
  console.log('init editor finish');
};

const init = () => {
  window.initEditor = initEditor;
  // window.EditorBridge.postMessage('');
};

init();
