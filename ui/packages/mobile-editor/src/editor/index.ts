import { config } from '@/config';

import { autoSaveUpdate } from './autoSave';
import { cmFocus, createCMEditor } from './codemirror';
import { createMarkdownEditor } from './markdown/MarkdownEditor';

export const saveContent = (content: string) => {
  if (window.EditorBridge != null) {
    const msg = {
      command: 'save_file',
      content,
    };
    window.EditorBridge.postMessage(JSON.stringify(msg));
  }
};

export const getContent = () => {
  if (window.editor != null) {
    const content = window.editor.getMarkdown();
    return content;
  } else if (window.cmEditor != null) {
    const content = window.cmEditor.state.doc.toString();
    return content;
  }
  return null;
};

export const getContentJson = () => {
  const content = getContent();
  // Android 端, 字符串发送到 Flutter 时, 会自动变为 Json
  if (window.isAndroid) return content;
  return content == null ? null : JSON.stringify(content);
};

export const onUpdateState = (state?: {
  charCount?: number;
  rowIndex?: number;
  colIndex?: number;
}) => {
  if (window.EditorBridge != null) {
    const msg = {
      command: 'update_state',
      state,
    };
    window.EditorBridge.postMessage(JSON.stringify(msg));
  }
  autoSaveUpdate(getContent);
};

const bodyClick = (e: MouseEvent) => {
  // console.log('bodyClick', e.target, window.isScrollable);
  if (window.isScrollable) {
    return;
  }
  if (e.target !== document.body) {
    if (e.target instanceof HTMLElement) {
      const id = e.target.id;
      if (
        id !== config.rootId &&
        id !== config.cmRootId &&
        id !== config.mdRootId &&
        !e.target.classList.contains('milkdown')
      ) {
        return;
      }
    }
  }
  if (window.editor != null) {
    const editor = window.editor;
    editor.focus();
  }
  if (window.cmEditor != null) {
    cmFocus(window.cmEditor);
  }
};

const onScrollPositionChange = (e: Event) => {
  if (!window.EditorBridge) return;
  if (e.target instanceof Document) {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    window.EditorBridge.postMessage(
      JSON.stringify({
        command: 'scroll_position',
        scrollY: scrollTop,
      }),
    );
    return;
  }
  if (e.target instanceof HTMLElement) {
    const scrollTop = e.target.scrollTop;
    window.EditorBridge.postMessage(
      JSON.stringify({
        command: 'scroll_position',
        scrollY: scrollTop,
      }),
    );
  }
};

export const setEditorScrollbarValue = (value: number) => {
  let scrollDom: HTMLElement | null = null;
  if (window.editor != null) {
    scrollDom = window.isWebScrollbar ? document.getElementById(config.mdRootId)! : document.body;
  } else if (window.cmEditor != null) {
    scrollDom = window.isWebScrollbar ? document.getElementById(config.cmRootId)! : document.body;
  }
  if (scrollDom != null) {
    const halfHeight = scrollDom.scrollHeight * value;
    scrollDom.scrollTop = halfHeight;
  }
};

const observeScrollability = (
  el: HTMLElement | null,
  cb: (e: HTMLElement) => void,
): (() => void) => {
  el = el || document.body;
  const callback = () => {
    cb(el);
  };
  callback();
  const resizeObserver = new ResizeObserver(callback);
  resizeObserver.observe(el);
  const mutationObserver = new MutationObserver(callback);
  mutationObserver.observe(el, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
};

const onScrollContentChange = (el: HTMLElement) => {
  /// 当内容高度超过可视区域时，添加 editor-scrollable 类
  const isScrollable = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  window.isScrollable = isScrollable;
  // console.log('isScrollable', isScrollable);
  document.body.classList.toggle('editor-scrollable', isScrollable);
};

// const throttledOnRefreshEditor = () => {
//   const lastTimeout = (window as any).throttledOnRefreshEditorTimeout;
//   if (lastTimeout != null) {
//     clearTimeout(lastTimeout);
//     (window as any).throttledOnRefreshEditorTimeout = null;
//   }
//   (window as any).throttledOnRefreshEditorTimeout = setTimeout(() => {
//     (window as any).throttledOnRefreshEditorTimeout = null;
//     window.cmEditor?.requestMeasure();
//   }, 200);
// };

export const createEditor = async (fileName: string, sourceMode: boolean, content: string) => {
  if ((window as any).onCleanEvents != null) {
    (window as any).onCleanEvents();
  }
  if (window.editor != null) {
    window.editor.destroy();
    window.editor = null;
  }
  if (window.cmEditor != null) {
    window.cmEditor.destroy();
    window.cmEditor = null;
  }
  const cmRoot = document.getElementById(config.cmRootId)!;
  const mdRoot = document.getElementById(config.mdRootId)!;

  const cmScrollDom = window.isWebScrollbar ? cmRoot : document.body;
  const mdScrollDom = window.isWebScrollbar ? mdRoot : document.body;

  const editorDisplay = 'block';

  let onScrollContentChangeCleanup: (() => void) | null = null;
  if (sourceMode) {
    mdRoot.style.display = 'none';
    cmRoot.style.display = editorDisplay;
    window.cmEditor = createCMEditor(cmRoot, content, fileName);
    cmScrollDom?.addEventListener('scroll', onScrollPositionChange);
    onScrollContentChangeCleanup = observeScrollability(cmScrollDom, onScrollContentChange);
  } else {
    cmRoot.style.display = 'none';
    mdRoot.style.display = editorDisplay;
    window.editor = await createMarkdownEditor(mdRoot, content, window.previewMode || false);
    mdScrollDom?.addEventListener('scroll', onScrollPositionChange);
    onScrollContentChangeCleanup = observeScrollability(mdScrollDom, onScrollContentChange);
  }
  document.body.addEventListener('click', bodyClick);

  if (!window.isWebScrollbar && window.isIOS) {
    // iOS 端, 需要监听 document 的滚动事件, 因为 body 的滚动事件不生效
    document.addEventListener('scroll', onScrollPositionChange);
  }

  (window as any).onCleanEvents = () => {
    onScrollContentChangeCleanup?.();
    document.body.removeEventListener('click', bodyClick);
    document.removeEventListener('scroll', onScrollPositionChange);
    cmScrollDom?.removeEventListener('scroll', onScrollPositionChange);
    mdScrollDom?.removeEventListener('scroll', onScrollPositionChange);
  };
};
