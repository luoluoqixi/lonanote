import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Compartment, EditorState } from '@codemirror/state';
import {
  EditorView,
  KeyBinding,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';

import { onUpdateState, saveContent } from '..';
import './CodeMirrorEditor.scss';
import { detectCodeMirrorLanguage } from './detecLanguages';
import { codemirrorDarkTheme, codemirrorLightTheme } from './theme';

let readOnlyEx: Compartment | null = null;

export const setCMReadOnly = (readOnly: boolean) => {
  if (!window.cmEditor || !readOnlyEx) return;
  window.cmEditor.dispatch({
    effects: readOnlyEx.reconfigure(EditorView.editable.of(readOnly ? false : true)),
  });
};

export const createCMEditor = (root: HTMLElement, content: string, fileName: string) => {
  readOnlyEx = new Compartment();
  // console.log('codemirror create');
  let view: EditorView | null = null;
  if (root) {
    const saveBinding: KeyBinding = {
      key: 'Mod-s', // Mod 代表 Ctrl（Windows）或 Cmd（Mac）
      preventDefault: true,
      run: (view) => {
        const onSave = saveContent;
        if (onSave) {
          onSave(view.state.doc.toString());
        }
        return true;
      },
    };
    const focusChangeListener = EditorView.domEventHandlers({
      focus: () => {
        // if (onFocusChange) onFocusChange(true);
      },
      blur: () => {
        // if (onFocusChange) onFocusChange(false);
      },
    });
    const updateListener = EditorView.updateListener.of((update) => {
      if (onUpdateState != null) {
        const charCount = update.state.doc.length;
        const cursorPos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(cursorPos);
        const rowIndex = line.number;
        const colIndex = cursorPos - line.from;
        onUpdateState({ charCount, rowIndex, colIndex });
      }
    });
    const theme = window.colorMode === 'dark' ? codemirrorDarkTheme : codemirrorLightTheme;
    const state = EditorState.create({
      doc: content || '',
      extensions: [
        readOnlyEx.of(EditorView.editable.of(window.previewMode ? false : true)),
        detectCodeMirrorLanguage(fileName),
        focusChangeListener,
        //自动换行
        EditorView.lineWrapping,
        updateListener,
        // 行号
        lineNumbers(),
        // 用占位符替换不可打印字符
        highlightSpecialChars(),
        // 撤销历史
        history(),
        // // 替换原始光标选区
        // drawSelection(),
        // 替换拖拽时的放置光标
        // dropCursor(),
        // Allow multiple cursors/selections
        EditorState.allowMultipleSelections.of(true),
        // 输入特定输入时自动缩进
        indentOnInput(),
        // // 高亮显示
        // syntaxHighlighting(defaultHighlightStyle),
        // 高亮光标旁边的匹配括号
        bracketMatching(),
        // 自动补全右括号
        closeBrackets(),
        // 自动完成系统
        autocompletion(),
        // alt-drag 选择矩形区域
        rectangularSelection(),
        // // 按住 alt 时, 光标更改为十字
        // crosshairCursor(),
        // 高亮激活的行
        highlightActiveLine(),
        // Style the gutter for current line specially
        // highlightActiveLineGutter(),
        // 突出显示与所选文本匹配的文本
        // highlightSelectionMatches(),
        // 折叠功能
        foldGutter(),
        theme,
        keymap.of([
          // 保存功能
          saveBinding,
          // 按Tab键缩进
          indentWithTab,
          // 关闭括号支持退格
          ...closeBracketsKeymap,
          // 大量基本键绑定
          ...defaultKeymap,
          // 搜索相关的键
          ...searchKeymap,
          // Redo/undo 快捷键
          ...historyKeymap,
        ]),
      ],
    });
    view = new EditorView({
      parent: root,
      state,
    });
  }
  return view;
};

/// 获取焦点并设置光标到最后位置
export const cmFocus = (editor: EditorView, pos?: { x: number; y: number }) => {
  const lastLine = editor.state.doc.lines;
  const lastPos = editor.state.doc.line(lastLine).to;

  let targetPos: number;
  if (pos) {
    const found = editor.posAtCoords(pos);
    if (found !== null) {
      targetPos = found;
    } else {
      const domRect = editor.dom.getBoundingClientRect();
      if (pos.y < domRect.top) {
        targetPos = 0; // 在编辑器上方，光标放文档开头
      } else if (pos.y > domRect.bottom) {
        targetPos = lastPos; // 在编辑器下方，光标放文档末尾
      } else {
        targetPos = lastPos;
      }
    }
  } else {
    targetPos = lastPos;
  }

  editor.dispatch({
    selection: { anchor: targetPos, head: targetPos },
    effects: EditorView.scrollIntoView(targetPos, { y: 'center' }),
  });
  editor.focus();
};

export const isCursorInViewport = (view: EditorView, container?: HTMLElement): boolean => {
  if (!view.hasFocus) return false;

  container = container || view.scrollDOM;
  const pos = view.state.selection.main.head;
  const cursorCoords = view.coordsAtPos(pos);
  if (!cursorCoords) return false;

  const containerRect = container.getBoundingClientRect();

  return (
    cursorCoords.top >= containerRect.top &&
    cursorCoords.bottom <= containerRect.bottom &&
    cursorCoords.left >= containerRect.left &&
    cursorCoords.right <= containerRect.right
  );
};

export const cmScrollToCursor = (view: EditorView) => {
  const pos = view.state.selection.main.head;
  view.dispatch({
    effects: EditorView.scrollIntoView(pos, {
      y: 'nearest',
      yMargin: 0,
    }),
  });
};

export const cmAutoScrollToCursor = (view: EditorView, container?: HTMLElement) => {
  if (view.hasFocus) {
    if (!isCursorInViewport(view, container)) {
      cmScrollToCursor(view);
    }
  }
};

export const cmCanUndo = (view: EditorView): boolean => {
  return undoDepth(view.state) > 0;
};

export const cmCanRedo = (view: EditorView): boolean => {
  return redoDepth(view.state) > 0;
};

export const cmUndo = (view: EditorView): void => {
  undo(view);
};

export const cmRedo = (view: EditorView): void => {
  redo(view);
};
