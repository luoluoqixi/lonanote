import { config } from '@/config';
import { callFlutter } from '@/utils/flutter';

import { autoSaveUpdate } from './autoSave';
import { cmAutoScrollToCursor, cmFocus, createCMEditor } from './codemirror';

export const saveContent = (content: string) => {
  callFlutter('save_file', content);
};

export const getContent = () => {
  if (window.editor != null) {
    const content = window.editor.state.doc.toString();
    return content;
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
  // console.log('bodyClick', e.target, window.isScrollable);
  // if (window.isScrollable) {
  //   return;
  // }
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
    cmFocus(editor, {
      x: e.clientX,
      y: e.clientY,
    });
  }
};

const sendCurrentScrollPosition = (e: Event) => {
  if (!window.flutter_inappwebview) return;
  if (e.target instanceof Document) {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    callFlutter('scroll_position', scrollTop);
    return;
  }
  if (e.target instanceof HTMLElement) {
    const scrollTop = e.target.scrollTop;
    callFlutter('scroll_position', scrollTop);
  }
};

const onScrollPositionChange = (e: Event) => {
  const w = window as any;
  sendCurrentScrollPosition(e);
  if (w.scrollPositionChangeAnimId != null) {
    cancelAnimationFrame(w.scrollPositionChangeAnimId);
    w.scrollPositionChangeAnimId = null;
  }
  if (w.scrollPositionChangeStop != null) {
    clearTimeout(w.scrollPositionChangeStop);
    w.scrollPositionChangeStop = null;
  }
  function send() {
    w.scrollPositionChangeAnimId = requestAnimationFrame(() => {
      sendCurrentScrollPosition(e);
      send();
    });
  }
  send();

  w.scrollPositionChangeStop = setTimeout(() => {
    if (w.scrollPositionChangeAnimId != null) {
      cancelAnimationFrame(w.scrollPositionChangeAnimId);
      w.scrollPositionChangeAnimId = null;
    }
  }, 100);
};

// const observeScrollability = (
//   el: HTMLElement | null,
//   cb: (e: HTMLElement) => void,
// ): (() => void) => {
//   el = el || document.body;
//   const callback = () => {
//     cb(el);
//   };
//   callback();
//   const resizeObserver = new ResizeObserver(callback);
//   resizeObserver.observe(el);
//   const mutationObserver = new MutationObserver(callback);
//   mutationObserver.observe(el, {
//     childList: true,
//     subtree: true,
//     characterData: true,
//   });
//   return () => {
//     resizeObserver.disconnect();
//     mutationObserver.disconnect();
//   };
// };

// const onScrollContentChange = (el: HTMLElement) => {
//   /// 当内容高度超过可视区域时，添加 editor-scrollable 类
//   const isScrollable = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
//   window.isScrollable = isScrollable;
//   // console.log('isScrollable', isScrollable);
//   document.body.classList.toggle('editor-scrollable', isScrollable);

//   callFlutter('scrollable', {
//     scrollHeight: el.scrollHeight,
//     clientHeight: el.clientHeight,
//   });
// };

const autoScrollToCursorStart = () => {
  if (window.editor != null) {
    const editor = window.editor;
    cmAutoScrollToCursor(editor, document.body);
  }
};

function handleWindowResize() {
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
}

export const createEditor = async (
  fileName: string,
  sourceMode: boolean | undefined,
  isSourceModeShowLine: boolean | undefined,
  content: string,
) => {
  if ((window as any).onCleanEvents != null) {
    (window as any).onCleanEvents();
  }
  if (window.editor != null) {
    window.editor.destroy();
    window.editor = null;
  }
  const cmRoot = document.getElementById(config.cmRootId)!;

  // const cmScrollDom = cmRoot;
  const editorDisplay = 'block';

  // let onScrollContentChangeCleanup: (() => void) | null = null;
  // if (sourceMode) {
  // }
  cmRoot.style.display = editorDisplay;
  window.editor = createCMEditor(cmRoot, content, fileName, isSourceModeShowLine);
  // cmScrollDom?.addEventListener('scroll', onScrollPositionChange);
  // onScrollContentChangeCleanup = observeScrollability(cmScrollDom, onScrollContentChange);

  document.body.addEventListener('click', bodyClick);

  // iOS 和 Android, 需要监听 document 的滚动事件, 因为 body 的滚动事件不生效
  document?.addEventListener('scroll', onScrollPositionChange);

  // 添加 resize 事件监听
  window.addEventListener('resize', handleWindowResize);

  (window as any).onCleanEvents = () => {
    // onScrollContentChangeCleanup?.();
    window?.removeEventListener('resize', handleWindowResize);
    document.body.removeEventListener('click', bodyClick);
    document?.removeEventListener('scroll', onScrollPositionChange);
    // cmScrollDom?.removeEventListener('scroll', onScrollPositionChange);
  };
};
