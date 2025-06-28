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

const appendTestBtn = (text: string, onClick: (e: MouseEvent) => void) => {
  const root = document.getElementById('root')!;
  const btnWrapId = 'test-button-wrap';
  if (!document.getElementById(btnWrapId)) {
    const wrap = document.createElement('div');
    wrap.id = btnWrapId;
    root.appendChild(wrap);
  }
  const btnWrap = document.getElementById(btnWrapId)!;
  const btn = document.createElement('button');
  btn.innerHTML = text;
  btn.className = 'test-btn';
  btn.onclick = onClick;
  btnWrap.appendChild(btn);
};

const init = () => {
  window.initEditor = initEditor;
  window.invokeCommand = invokeCommand;
  window.getContent = getContent;
  // window.EditorBridge.postMessage('');
  if (!config.isFlutter) {
    const testContent = 'test';
    window.sourceMode = true;
    initEditor('default.js', window.sourceMode, testContent);
    window.setColorMode('light');
    appendTestBtn('切换编辑器', () => {
      if (window.sourceMode) {
        window.initEditor('default.md', false, testContent);
      } else {
        window.initEditor('default.js', true, testContent);
      }
    });
    appendTestBtn('切换主题', () =>
      window.setColorMode(window.colorMode === 'light' ? 'dark' : 'light', true),
    );
  }
};

init();
