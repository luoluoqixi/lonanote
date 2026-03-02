import { invokeCommand } from './commands';
import { config } from './config';
import { createEditor, getContentJson } from './editor';
import './styles/index.scss';
import './theme';
import './utils';

const initEditor = (fileName: string, content: string) => {
  window.fileName = fileName;
  window.fileContent = content;
  if (window.previewMode == null) {
    window.previewMode = false;
  }
  console.log('init editor');
  createEditor(fileName, content);
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

const init = () => {
  window.initEditor = initEditor;
  window.invokeCommand = invokeCommand;
  window.getContent = getContentJson;

  if (config.isDev && !config.isFlutter) {
    let testFileName = 'default.md';
    let testContent = config.testContent || 'test content';
    window.sourceMode = false;
    window.setColorMode('light', window.primaryColor);
    initEditor(testFileName, testContent);
    appendTestBtn('源码模式', () => {
      window.sourceMode = !window.sourceMode;
      window.initEditor(testFileName, testContent);
    });
    appendTestBtn('切换主题', () => {
      window.setColorMode(
        window.colorMode === 'light' ? 'dark' : 'light',
        window.primaryColor,
        true,
      );
      let backgroundColor;
      if (window.colorMode === 'light') {
        backgroundColor = '#ffffff';
      } else {
        backgroundColor = '#000000';
      }
      document.body.style.backgroundColor = backgroundColor;
    });
    appendTestBtn('显示行号', () => {
      window.isShowLineNumber = !window.isShowLineNumber;
      initEditor(testFileName, testContent);
    });
    appendTestBtn('更换文件', () => {
      testFileName = testFileName.endsWith('.js') ? 'default.md' : 'default.js';
      testContent =
        (testFileName.endsWith('.md')
          ? config.testContent
          : '\n\nconsole.log("test content")\n\nfunction test() {\n  console.log("test content");\n}\n\n\n') ||
        'test content';
      initEditor(testFileName, testContent);
    });
  }
};

init();
