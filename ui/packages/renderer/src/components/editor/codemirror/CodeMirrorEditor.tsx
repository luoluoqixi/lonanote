import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Transaction } from '@codemirror/state';
import {
  EditorView,
  KeyBinding,
  crosshairCursor,
  highlightActiveLine,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view';
import clsx from 'clsx';
import {
  CSSProperties,
  Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import './CodeMirrorEditor.scss';
import { detectLanguage } from './detectLanguage';
import { useCodeMirrorTheme } from './theme';

export interface CodeMirrorEditorRef {
  getEditor: () => EditorView | null;
  setValue: (content: string, useHistory?: boolean) => void;
  getValue: () => string | null;
}

export interface UpdateState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export interface CodeMirrorEditorProps {
  filePath: string;
  initValue: string | null;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onFocusChange?: (focus: boolean) => void;
  onUpdateStateListener?: (state: UpdateState) => void;
  onUpdate?: () => void;
}

export default forwardRef((props: CodeMirrorEditorProps, ref: Ref<CodeMirrorEditorRef>) => {
  const {
    className,
    style,
    filePath,
    readOnly,
    onSave,
    onFocusChange,
    onUpdateStateListener,
    onUpdate,
    initValue,
  } = props;
  const theme = useCodeMirrorTheme();
  const editorRootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<EditorView | null>(null);
  const [readOnlyEx, setReadOnlyEx] = useState<Compartment | null>(null);

  useLayoutEffect(() => {
    console.log('codemirror create');
    let view: EditorView | null = null;
    if (editorRootRef.current) {
      const readOnlyEx = new Compartment();
      const saveBinding: KeyBinding = {
        key: 'Mod-s', // Mod 代表 Ctrl（Windows）或 Cmd（Mac）
        preventDefault: true,
        run: (view) => {
          if (onSave) {
            onSave(view.state.doc.toString());
          }
          return true;
        },
      };
      const focusChangeListener = EditorView.domEventHandlers({
        focus: () => {
          if (onFocusChange) onFocusChange(true);
        },
        blur: () => {
          if (onFocusChange) onFocusChange(false);
        },
      });
      const updateListener = EditorView.updateListener.of((update) => {
        if (onUpdate) {
          onUpdate();
        }
        if (onUpdateStateListener) {
          const charCount = update.state.doc.length;
          const cursorPos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(cursorPos);
          const rowIndex = line.number;
          const colIndex = cursorPos - line.from;
          onUpdateStateListener({ charCount, rowIndex, colIndex });
        }
      });
      const state = EditorState.create({
        doc: initValue || '',
        extensions: [
          readOnlyEx.of(EditorView.editable.of(readOnly ? false : true)),
          detectLanguage(filePath),
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
          // 按住 alt 时, 光标更改为十字
          crosshairCursor(),
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
        parent: editorRootRef.current,
        state,
      });
      setView(view);
      setReadOnlyEx(readOnlyEx);
    }
    return () => {
      if (view) {
        view.destroy();
        setView(null);
        setReadOnlyEx(null);
      }
    };
  }, [onSave, onUpdateStateListener, onUpdate, theme, initValue]);

  useEffect(() => {
    if (!view || !readOnlyEx) return;
    view.dispatch({
      effects: readOnlyEx.reconfigure(EditorView.editable.of(readOnly ? false : true)),
    });
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getEditor() {
      return view;
    },
    setValue(content, useHistory) {
      if (!view) return;
      view.dispatch({
        annotations: useHistory ? undefined : Transaction.addToHistory.of(false),
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content || '',
        },
      });
      view.dispatch({
        effects: EditorView.scrollIntoView(0),
      });
    },
    getValue() {
      if (!view) return null;
      return view.state.doc.toString();
    },
  }));

  return <div ref={editorRootRef} style={style} className={clsx('cm6-theme', className)}></div>;
});
