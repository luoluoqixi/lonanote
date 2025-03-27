import clsx from 'clsx';
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
  setValue: (content: string) => void;
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

const setReadOnly = (editor: CodeMirror.EditorFromTextArea, readOnly: boolean | undefined) => {
  const v = readOnly ? 'nocursor' : false;
  editor.setOption('readOnly', v);
};

export default forwardRef((props: CodeMirrorEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { className, style, readOnly, onSave, onUpdateListener } = props;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [editor, setEditor] = useState<CodeMirror.EditorFromTextArea | null>(null);
  useLayoutEffect(() => {
    console.log('hypermd create');
    if (!editorRef.current) return;
    onUpdateListener?.(null);
    let cm: CodeMirror.EditorFromTextArea | null = HyperMD.fromTextArea(editorRef.current, {
      hmdModeLoader: false,
      lineNumbers: false,
      mode: {
        name: 'hypermd',
        hashtag: true,
      },
      hmdClick: (info: ClickHandleInfo, cm: CodeMirror.EditorFromTextArea) => {
        if (info.type === 'link' || info.type === 'url') {
          if (info.ctrlKey) {
            const url = info.url;
            console.log('点击url: ', info, url);
          }
          return false;
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
    setReadOnly(cm, readOnly);
    cm.setValue('');
    setEditor(cm);
    return () => {
      if (cm) {
        cm.toTextArea();
        cm = null;
        setEditor(null);
        onUpdateListener?.(null);
      }
    };
  }, []);

  useEffect(() => {
    if (editor) {
      // 初始化Editor
      editor.on('keydown', (cm, e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          if (onSave && editor) {
            onSave(editor.getValue());
            e.preventDefault();
          }
        }
      });
      // editor.on('copy', (cm, e) => {
      //   // ignore copy by codemirror.  and will copy by browser
      //   // e.codemirrorIgnore = true;
      //   console.log(e);
      // });
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    setReadOnly(editor, readOnly);
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return editor?.getValue();
    },
    setValue(content) {
      editor?.setValue(content);
    },
  }));

  return (
    <div className={className} style={style}>
      <textarea ref={editorRef} />
    </div>
  );
});
