import { invokeCommand } from './commands';
import { config } from './config';
import { createEditor, getContentJson } from './editor';
import './styles/index.scss';
import './theme';
import './utils';

const initEditor = async (
  fileName: string,
  sourceMode: boolean | undefined,
  isShowLineNumber: boolean | undefined,
  content: string,
) => {
  window.sourceMode = sourceMode;
  window.fileName = fileName;
  window.fileContent = content;
  if (window.previewMode == null) {
    window.previewMode = false;
  }
  console.log('init editor');
  await createEditor(fileName, sourceMode, isShowLineNumber, content);
  console.log(`init editor finish: ${fileName}`);
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

const init = async () => {
  window.initEditor = initEditor;
  window.invokeCommand = invokeCommand;
  window.getContent = getContentJson;

  if (config.isDev && !config.isFlutter) {
    const testContent = config.testContent || 'test content';
    window.sourceMode = false;
    initEditor('default.js', window.sourceMode, window.isShowLineNumber, testContent);
    window.setColorMode('light');
    appendTestBtn('切换编辑器', () => {
      const targetSourceMode = !window.sourceMode;
      window.initEditor(
        targetSourceMode ? 'default.js' : 'default.md',
        targetSourceMode,
        window.isShowLineNumber,
        testContent,
      );
    });
    appendTestBtn('切换主题', () =>
      window.setColorMode(window.colorMode === 'light' ? 'dark' : 'light', true),
    );
  }
};

init();
