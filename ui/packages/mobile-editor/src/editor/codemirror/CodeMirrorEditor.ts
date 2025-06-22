import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
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
        // EditorView.lineWrapping,
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
