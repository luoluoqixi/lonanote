import { EditorView } from '@codemirror/view';
import { commands } from 'purrmd';

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

const updateSelectionState = () => {
  const editor = window.editor?.editor;
  if (!editor) return;
  try {
    const state = editor.state;
    const selection = state.selection.main;
    const isSelectionRange = selection.from === selection.to;
    const isBold = commands.isStrong(state);
    const isItalic = commands.isItalic(state);
    const isStrikethrough = commands.isStrikethrough(state);
    const isHighlight = commands.isHighlight(state);
    const isInlineCode = commands.isInlineCode(state);

    const isHeading1 = commands.isHeading1(state);
    const isHeading2 = commands.isHeading2(state);
    const isHeading3 = commands.isHeading3(state);
    const isHeading4 = commands.isHeading4(state);
    const isHeading5 = commands.isHeading5(state);
    const isHeading6 = commands.isHeading6(state);
    const isUnorderedList = commands.isUnorderedList(state);
    const isOrderedList = commands.isOrderedList(state);
    const isTaskList = commands.isTaskList(state);
    const isBlockquote = commands.isBlockquote(state);

    callFlutter('update_selection', {
      isSelectionRange,
      isBold,
      isItalic,
      isStrikethrough,
      isHighlight,
      isInlineCode,

      isHeading1,
      isHeading2,
      isHeading3,
      isHeading4,
      isHeading5,
      isHeading6,
      isUnorderedList,
      isOrderedList,
      isTaskList,
      isBlockquote,
    });
  } catch (e) {
    console.error(`update_selection error: ${e}`);
  }
};

export const onUpdateState = (state?: {
  charCount?: number;
  rowIndex?: number;
  colIndex?: number;
}) => {
  callFlutter('update_state', state);
  autoSaveUpdate(getContent);
  updateSelectionState();
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
      editor.scrollToCursor(document.body);
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
  let isSelectionChange = false;
  if ((window as any).onCleanEvents != null) {
    (window as any).onCleanEvents();
  }
  if (window.editor != null) {
    window.editor.destroy();
    window.editor = null;
  }
  const eventHandler = EditorView.domEventHandlers({
    click() {
      if (window.isIOS) {
        requestAnimationFrame(() => {
          if (isSelectionChange) return;
          updateCursorIsViewport();
        });
      }
    },
  });

  const cmRoot = document.getElementById(config.cmRootId)!;
  window.editor = create(cmRoot, content, fileName, [eventHandler]);

  document.body.addEventListener('click', bodyClick);

  const handleWindowResize = () => updateCursorIsViewport();

  // 添加 resize 事件监听
  window.addEventListener('resize', handleWindowResize);
  window.editor?.addListener('onUpdate', (editor, update) => {
    if (update.selectionSet) {
      if (window.isIOS) {
        isSelectionChange = true;
        updateCursorIsViewport();
        requestAnimationFrame(() => {
          isSelectionChange = false;
        });
      }
    }
  });

  (window as any).onCleanEvents = () => {
    window?.removeEventListener('resize', handleWindowResize);
    document.body.removeEventListener('click', bodyClick);
  };
};
