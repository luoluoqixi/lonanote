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
    editor.focus({
      x: e.clientX,
      y: e.clientY,
    });
  }
};

// const sendCurrentScrollPosition = (e: Event) => {
//   if (!window.flutter_inappwebview) return;
//   if (e.target instanceof Document) {
//     const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
//     callFlutter('scroll_position', scrollTop);
//     return;
//   }
//   if (e.target instanceof HTMLElement) {
//     const scrollTop = e.target.scrollTop;
//     callFlutter('scroll_position', scrollTop);
//   }
// };

// const onScrollPositionChange = (e: Event) => {
//   const w = window as any;
//   sendCurrentScrollPosition(e);
//   if (w.scrollPositionChangeAnimId != null) {
//     cancelAnimationFrame(w.scrollPositionChangeAnimId);
//     w.scrollPositionChangeAnimId = null;
//   }
//   if (w.scrollPositionChangeStop != null) {
//     clearTimeout(w.scrollPositionChangeStop);
//     w.scrollPositionChangeStop = null;
//   }
//   function send() {
//     w.scrollPositionChangeAnimId = requestAnimationFrame(() => {
//       sendCurrentScrollPosition(e);
//       send();
//     });
//   }
//   send();

//   w.scrollPositionChangeStop = setTimeout(() => {
//     if (w.scrollPositionChangeAnimId != null) {
//       cancelAnimationFrame(w.scrollPositionChangeAnimId);
//       w.scrollPositionChangeAnimId = null;
//     }
//   }, 100);
// };

const autoScrollToCursorStart = () => {
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
      editor.autoScrollToCursor(document.body);
    }
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
  isShowLineNumber: boolean | undefined,
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
  const editorDisplay = 'block';

  cmRoot.style.display = editorDisplay;
  window.editor = create(cmRoot, content, fileName, isShowLineNumber, sourceMode);

  document.body.addEventListener('click', bodyClick);

  // iOS 和 Android, 需要监听 document 的滚动事件, 因为 body 的滚动事件不生效
  // document?.addEventListener('scroll', onScrollPositionChange);
  // 添加 resize 事件监听
  window.addEventListener('resize', handleWindowResize);

  // window.editor?.addListener('onFocus', (editor, focus) => {
  //   if (focus) {
  //     const editorDom = window.editor?.editor.dom;
  //     if (editorDom) {
  //       editorDom.style.opacity = '0';
  //       setTimeout(() => (editorDom.style.opacity = '1'), 100);
  //       requestAnimationFrame(() => {
  //         requestAnimationFrame(() => {
  //           editorDom.style.opacity = '1';
  //         });
  //       });
  //     }
  //   }
  // });

  (window as any).onCleanEvents = () => {
    window?.removeEventListener('resize', handleWindowResize);
    document.body.removeEventListener('click', bodyClick);
    // document?.removeEventListener('scroll', onScrollPositionChange);
  };
};
