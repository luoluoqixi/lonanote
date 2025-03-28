import CodeMirror from 'codemirror';
import * as HyperMD from 'hypermd';
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

import './MarkdownEditor.scss';

export interface MarkdownEditorRef {
  getMarkdown: () => string | undefined;
  setValue: (content: string, useHistory?: boolean) => void;
}

export interface UpdateState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

export interface ClickPos {
  line: number;
  ch: number;
  sticky: string;
  xRel: number;
}

export interface ClickHandleInfo {
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  button: number;
  clientX: number;
  clientY: number;
  pos: ClickPos;
  text?: string;
  type: string;
  url?: string;
}

export interface CodeMirrorEditorProps {
  fileName: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
  onUpdateListener?: (state: UpdateState | null) => void;
}

const readOnlyMouseDown = (cm: CodeMirror.Editor, e: MouseEvent) => {
  e.preventDefault();
};

const readOnlyMouseClick = (e: MouseEvent) => {
  if (e.button === 0) {
    window.getSelection()?.removeAllRanges();
  }
  e.preventDefault();
};

const setReadOnly = (editor: CodeMirror.EditorFromTextArea, readOnly: boolean | undefined) => {
  const v = readOnly ? 'nocursor' : false;
  editor.setOption('readOnly', v);
  editor.off('mousedown', readOnlyMouseDown);
  const wrapper = editor.getWrapperElement();
  if (wrapper) {
    wrapper.removeEventListener('click', readOnlyMouseClick);
  }
  if (readOnly) {
    // 禁用鼠标事件
    editor.on('mousedown', readOnlyMouseDown);
    // 清除所有选区
    editor.setCursor(0, 0);
    if (wrapper) {
      wrapper.addEventListener('click', readOnlyMouseClick);
    }
  }
};

export default forwardRef((props: CodeMirrorEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { className, style, readOnly, onSave, onUpdateListener } = props;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [editor, setEditor] = useState<CodeMirror.EditorFromTextArea | null>(null);
  useLayoutEffect(() => {
    if (!editorRef.current) return;
    onUpdateListener?.(null);
    let cm: CodeMirror.EditorFromTextArea | null = HyperMD.fromTextArea(editorRef.current, {
      hmdModeLoader: false,
      lineNumbers: false, // 隐藏行号
      styleSelectedText: false, // 禁用选择高亮
      highlightSelectionMatches: false, // 禁用匹配高亮
      mode: {
        name: 'hypermd',
        front_matter: true, // Yaml前言
        hashtag: true, // hashtag
        table: false, // 表格功能, 使用自己实现的
        math: true, // 数学公式
        toc: true, // toc占位符
        orgModeMarkup: true,
      },
      hmdClick: (info: ClickHandleInfo, cm: CodeMirror.EditorFromTextArea) => {
        if (info.type === 'link' || info.type === 'url') {
          if (info.ctrlKey) {
            const url = info.url;
            console.log('点击url: ', info, url);
          }
          return false;
        } else if (info.type === 'todo') {
          return true;
        }
        console.log('click', info, cm);
        return false;
      },
      hmdFold: {
        image: true,
        link: true,
        math: true,
        html: true,
        emoji: true,
      },
    } as CodeMirror.EditorConfiguration) as CodeMirror.EditorFromTextArea;
    /// 如果多次调用cm.on, 事件无法清除
    // const events = (cm as any)._handlers;
    // if (events['keydown']) {
    //   events['keydown'] = [];
    // }
    cm.on('keydown', (cm, e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (onSave && cm) {
          onSave(cm.getValue());
          e.preventDefault();
        }
      }
    });
    // cm.on('copy', (cm, e) => {
    //   // ignore copy by codemirror.  and will copy by browser
    //   // e.codemirrorIgnore = true;
    //   console.log(e);
    // });
    setReadOnly(cm, readOnly);
    cm.setValue('');
    setEditor(cm);
    console.log('hypermd create');
    return () => {
      if (cm) {
        cm.toTextArea();
        cm = null;
        setEditor(null);
        onUpdateListener?.(null);
      }
    };
  }, [onSave, onUpdateListener]);

  useEffect(() => {
    if (!editor) return;
    setReadOnly(editor, readOnly);
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return editor?.getValue();
    },
    setValue(content, useHistory) {
      try {
        editor?.setValue(content);
        if (!useHistory) {
          editor?.clearHistory();
        }
      } catch (e) {
        console.error('setValue error:', e);
      }
    },
  }));

  return (
    <div className={className} style={style}>
      <textarea ref={editorRef} />
    </div>
  );
});
