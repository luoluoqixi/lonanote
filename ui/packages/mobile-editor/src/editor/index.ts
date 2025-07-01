import { config, getTitleBarHeight } from '@/config';

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
  if (window.isScrollable) {
    if (window.editor != null) {
      const editor = window.editor;
      editor.focusClick(e);
      e.preventDefault();
    }
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

const observeScrollability = (el: HTMLElement, cb: (e: HTMLElement) => void): (() => void) => {
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
  if (window.isVirtualScrollEnabled) {
    const root = document.getElementById(config.rootId);
    if (!root) return;
    const s = window.getComputedStyle(root);
    let paddingTop = parseFloat(s.paddingTop) || 0;
    let paddingBottom = parseFloat(s.paddingBottom) || 0;
    paddingTop = isNaN(paddingTop) ? 0 : paddingTop;
    paddingBottom = isNaN(paddingBottom) ? 0 : paddingBottom;
    const rootHeight = root.clientHeight - paddingTop - paddingBottom;
    const editorContentHeight = el.clientHeight;
    const isScrollable = editorContentHeight > rootHeight;
    document.documentElement.classList.toggle('editor-scrollable', isScrollable);
    root.style.setProperty('--editor-content-height', `${editorContentHeight}px`);
  } else {
    /// 当内容高度超过可视区域时，添加 editor-scrollable 类
    const isScrollable = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
    window.isScrollable = isScrollable;
    // console.log('isScrollable', isScrollable);
    document.documentElement.classList.toggle('editor-scrollable', isScrollable);
  }
};

const throttledOnRefreshEditor = () => {
  const lastTimeout = (window as any).throttledOnRefreshEditorTimeout;
  if (lastTimeout != null) {
    clearTimeout(lastTimeout);
    (window as any).throttledOnRefreshEditorTimeout = null;
  }
  (window as any).throttledOnRefreshEditorTimeout = setTimeout(() => {
    (window as any).throttledOnRefreshEditorTimeout = null;
    window.cmEditor?.requestMeasure();
  }, 200);
};

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
  const scrollWrap = document.getElementById('virtual-scroll-wrap');
  const cmRoot = document.getElementById(config.cmRootId)!;
  const mdRoot = document.getElementById(config.mdRootId)!;

  const cmScrollDom = cmRoot;
  const mdScrollDom = mdRoot;

  const editorDisplay = 'block';

  // function forwardTouchScroll(fromEl: HTMLElement) {}

  function onScrollWrapScroll() {
    if (!window.isVirtualScrollEnabled) return;
    if (!scrollWrap) return;
    const scrollTop = -(scrollWrap?.scrollTop || 0);
    const titleBarHeight = getTitleBarHeight();
    const top = titleBarHeight + scrollTop;
    cmRoot.style.top = `${top}px`;
    mdRoot.style.top = `${top}px`;
    throttledOnRefreshEditor();
  }
  scrollWrap?.addEventListener('scroll', onScrollWrapScroll);
  if (scrollWrap) scrollWrap.scrollTop = 0;

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

  (window as any).onCleanEvents = () => {
    onScrollContentChangeCleanup?.();
    // cmTouchCleanup?.();
    // mdTouchCleanup?.();
    scrollWrap?.removeEventListener('scroll', onScrollWrapScroll);
    document.body.removeEventListener('click', bodyClick);
    cmScrollDom?.removeEventListener('scroll', onScrollPositionChange);
    mdScrollDom?.removeEventListener('scroll', onScrollPositionChange);
  };
};
