import { config } from '@/config';
import { callFlutter } from '@/utils/flutter';

import { autoSaveUpdate } from './autoSave';
import { create } from './core/editor';

export const saveContent = (content: string) => {
  callFlutter('save_file', content);
};

export const getContent = () => {
  if (window.editor != null) {
    return window.editor.getValue();
  }
  return null;
};

export const getContentJson = () => {
  const content = getContent();

  // 只有在使用 flutter_webview 时, 才会有此问题
  // // Android 端, 字符串发送到 Flutter 时, 会自动变为 Json
  // if (window.isAndroid) return content;

  return content == null ? null : JSON.stringify(content);
};

export const onUpdateState = (state?: {
  charCount?: number;
  rowIndex?: number;
  colIndex?: number;
}) => {
  callFlutter('update_state', state);
  autoSaveUpdate(getContent);
};

const bodyClick = (e: MouseEvent) => {
  if (e.target !== document.body) {
    if (e.target instanceof HTMLElement) {
      const id = e.target.id;
      if (id !== config.rootId && id !== config.cmRootId) {
        return;
      }
    }
  }
  if (window.editor != null) {
    const editor = window.editor;
    editor.focus({
      x: e.clientX,
      y: e.clientY,
    });
  }
};

const autoScrollToCursorStart = () => {
  // iOS端是 body 在滚动
  // Android 端是 <html> 在滚动
  if (window.editor != null) {
    const editor = window.editor;
    if (window.isIOS) {
      if (editor.editor.hasFocus && !editor.isCursorInViewport(document.body)) {
        const scrollTop = editor.getScrollToCursorValue(document.body);
        if (scrollTop) {
          window.flutter_inappwebview.callHandler('setContentOffsetFromJS', {
            scrollTop,
          });
        }
      }
    } else if (window.isAndroid) {
      // editor.scrollToCursor(document.body);
    }
  }
};

const updateCursorIsViewport = () => {
  autoScrollToCursorStart();
  const w = window as any;
  if (w.autoScrollToCursorStartTimeout != null) {
    clearTimeout(w.autoScrollToCursorStartTimeout);
    w.autoScrollToCursorStartTimeout = null;
  }
  w.autoScrollToCursorStartTimeout = setTimeout(() => {
    w.autoScrollToCursorStartTimeout = null;
    autoScrollToCursorStart();
  }, 50);
};

export const createEditor = (fileName: string, content: string) => {
  if ((window as any).onCleanEvents != null) {
    (window as any).onCleanEvents();
  }
  if (window.editor != null) {
    window.editor.destroy();
    window.editor = null;
  }
  const cmRoot = document.getElementById(config.cmRootId)!;
  window.editor = create(cmRoot, content, fileName);

  document.body.addEventListener('click', bodyClick);

  const handleWindowResize = () => updateCursorIsViewport();

  // 添加 resize 事件监听
  window.addEventListener('resize', handleWindowResize);

  (window as any).onCleanEvents = () => {
    window?.removeEventListener('resize', handleWindowResize);
    document.body.removeEventListener('click', bodyClick);
  };
};
