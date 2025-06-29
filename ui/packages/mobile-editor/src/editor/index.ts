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
  // const root = document.getElementById(config.rootId);
  // if (!root) return;
  // const s = window.getComputedStyle(root);
  // let paddingTop = parseFloat(s.paddingTop) || 0;
  // let paddingBottom = parseFloat(s.paddingBottom) || 0;
  // paddingTop = isNaN(paddingTop) ? 0 : paddingTop;
  // paddingBottom = isNaN(paddingBottom) ? 0 : paddingBottom;
  // const rootHeight = root.clientHeight - paddingTop - paddingBottom;
  // const editorContentHeight = el.clientHeight;
  // const isScrollable = editorContentHeight > rootHeight;
  // document.body.classList.toggle('editor-scrollable', isScrollable);
  // root.style.setProperty('--editor-content-height', `${editorContentHeight}px`);

  /// 当内容高度超过可视区域时，添加 editor-scrollable 类
  const isScrollable = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  // console.log('isScrollable', isScrollable);
  document.body.classList.toggle('editor-scrollable', isScrollable);
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
  // const scrollWrap = document.getElementById('virtual-scroll-wrap');
  const cmRoot = document.getElementById(config.cmRootId)!;
  const mdRoot = document.getElementById(config.mdRootId)!;

  const cmScrollDom = cmRoot;
  const mdScrollDom = mdRoot;

  // function forwardTouchScroll(fromEl: HTMLElement) {
  //   let startY = 0;

  //   const touchStart = (e: TouchEvent) => {
  //     startY = e.touches[0].clientY;
  //   };

  //   const touchMove = (e: TouchEvent) => {
  //     const dy = startY - e.touches[0].clientY;
  //     scrollWrap?.scrollBy(0, dy);
  //     startY = e.touches[0].clientY;
  //     e.preventDefault();
  //   };

  //   const wheel = (e: WheelEvent) => {
  //     scrollWrap?.scrollBy(0, e.deltaY);
  //     e.preventDefault();
  //   };

  //   fromEl.addEventListener('touchstart', touchStart, { passive: true });
  //   fromEl.addEventListener('touchmove', touchMove, { passive: false });
  //   fromEl.addEventListener('wheel', wheel, { passive: false });

  //   return () => {
  //     fromEl.removeEventListener('touchstart', touchStart);
  //     fromEl.removeEventListener('touchmove', touchMove);
  //     fromEl.removeEventListener('wheel', wheel);
  //   };
  // }

  // function onScrollWrapScroll() {
  //   if (!scrollWrap) return;
  //   const scrollTop = scrollWrap?.scrollTop;
  //   cmRoot.style.transform = `translateY(${-scrollTop}px)`;
  //   mdRoot.style.transform = `translateY(${-scrollTop}px)`;
  // }
  // const cmTouchCleanup = forwardTouchScroll(cmScrollDom);
  // const mdTouchCleanup = forwardTouchScroll(mdScrollDom);
  // scrollWrap?.addEventListener('scroll', onScrollWrapScroll);

  let onScrollContentChangeCleanup: (() => void) | null = null;
  if (sourceMode) {
    cmRoot.style.display = 'block';
    mdRoot.style.display = 'none';
    window.cmEditor = createCMEditor(cmRoot, content, fileName);
    cmScrollDom?.addEventListener('scroll', onScrollPositionChange);
    onScrollContentChangeCleanup = observeScrollability(cmScrollDom, onScrollContentChange);
  } else {
    cmRoot.style.display = 'none';
    mdRoot.style.display = 'block';
    window.editor = await createMarkdownEditor(mdRoot, content, window.previewMode || false);
    mdScrollDom?.addEventListener('scroll', onScrollPositionChange);
    onScrollContentChangeCleanup = observeScrollability(mdScrollDom, onScrollContentChange);
  }
  document.body.addEventListener('click', bodyClick);

  (window as any).onCleanEvents = () => {
    onScrollContentChangeCleanup?.();
    // cmTouchCleanup?.();
    // mdTouchCleanup?.();
    // scrollWrap?.removeEventListener('scroll', onScrollWrapScroll);
    document.body.removeEventListener('click', bodyClick);
    cmScrollDom?.removeEventListener('scroll', onScrollPositionChange);
    mdScrollDom?.removeEventListener('scroll', onScrollPositionChange);
  };
};
