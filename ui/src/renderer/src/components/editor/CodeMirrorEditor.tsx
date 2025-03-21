import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap } from '@codemirror/view';
import {
  CSSProperties,
  Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import './CodeMirrorEditor.scss';

export interface CodeMirrorEditorRef {}

export interface CodeMirrorEditorProps {
  style?: CSSProperties;
  className?: string;
  getInitContent?: () => string;
}

export default forwardRef(
  ({ className, style, getInitContent }: CodeMirrorEditorProps, ref: Ref<CodeMirrorEditorRef>) => {
    const editorRootRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState<EditorView | null>(null);
    useEffect(() => {
      let view: EditorView | null = null;
      if (editorRootRef.current) {
        view = new EditorView({
          doc: getInitContent ? getInitContent() : '',
          parent: editorRootRef.current,
          extensions: [
            // 行号
            // lineNumbers(),
            // 用占位符替换不可打印字符
            highlightSpecialChars(),
            // 撤销历史
            history(),
            // 替换原始光标选区
            // drawSelection(),
            // 替换拖拽时的放置光标
            // dropCursor(),
            // Allow multiple cursors/selections
            EditorState.allowMultipleSelections.of(true),
            // Re-indent lines when typing specific input
            // indentOnInput(),
            // Highlight syntax with a default style
            // syntaxHighlighting(defaultHighlightStyle),
            // 高亮光标旁边的匹配括号
            bracketMatching(),
            // 自动补全右括号
            closeBrackets(),
            // 自动完成系统
            // autocompletion(),
            // alt-drag 选择矩形区域
            // rectangularSelection(),
            // 按住 alt 时, 光标更改为十字
            // crosshairCursor(),
            // 高亮激活的行
            // highlightActiveLine(),
            // Style the gutter for current line specially
            // highlightActiveLineGutter(),
            // 突出显示与所选文本匹配的文本
            // highlightSelectionMatches(),
            keymap.of([
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
        setView(view);
      }
      return () => {
        if (view) {
          view.destroy();
        }
      };
    }, [editorRootRef]);

    useImperativeHandle(ref, () => ({}));

    return <div ref={editorRootRef} style={style} className={className}></div>;
  },
);
