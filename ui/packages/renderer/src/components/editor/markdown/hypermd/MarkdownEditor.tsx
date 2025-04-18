import CodeMirror from 'codemirror';
import * as HyperMD from 'hypermd';
import {
  Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useEditor } from '@/controller/editor';

import { MarkdownEditorProps, MarkdownEditorRef } from '../types';
import './MarkdownEditor.scss';

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

const clearCMEvent = (cm: CodeMirror.Editor, eventName: Parameters<CodeMirror.Editor['on']>[0]) => {
  if (!cm) return;
  /// 如果多次调用cm.on, 事件无法清除
  const events = (cm as any)._handlers;
  if (events && events[eventName]) {
    events[eventName] = [];
  }
};

const readOnlyMouseDown = (cm: CodeMirror.Editor, e: MouseEvent) => {
  e.preventDefault();
};

const readOnlyMouseClick = (e: MouseEvent) => {
  if (e.button === 0) {
    window.getSelection()?.removeAllRanges();
  }
  e.preventDefault();
};

const setReadOnly = (
  editor: CodeMirror.EditorFromTextArea,
  readOnly: boolean | undefined,
  delay?: number,
) => {
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
    editor.setCursor(Number.MAX_VALUE);
    if (wrapper) {
      wrapper.addEventListener('click', readOnlyMouseClick);
    }
    if (delay) {
      // 初始化编辑器后, 光标会自动选中第一行, 似乎在setReadOnly之后, 这里加一个延迟设置
      setTimeout(() => {
        editor.setCursor(Number.MAX_VALUE);
      }, delay);
    }
  }
  // 光标如果设置回0, 0点, 编辑界面会自动跳回最上方
  // else {
  //   editor.setCursor(0, 0);
  // }
};

const countChars = (cm: CodeMirror.Editor) => {
  let count = 0;
  cm.eachLine((line) => {
    count += line.text.length;
  });
  return count;
};

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { className, style, readOnly, onSave, onUpdateListener } = props;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [editor, setEditor] = useState<CodeMirror.EditorFromTextArea | null>(null);
  const content = useEditor((s) => s.currentEditorContent);
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
    clearCMEvent(cm, 'keydown');
    cm.on('keydown', (cm, e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (onSave && cm) {
          onSave(cm.getValue());
          e.preventDefault();
        }
      }
    });
    const updateState = (cm: CodeMirror.Editor) => {
      if (cm == null) return;
      const cursor = cm.getCursor();
      onUpdateListener?.({
        rowIndex: cursor.line,
        colIndex: cursor.ch,
        charCount: countChars(cm),
      });
    };
    cm.on('cursorActivity', updateState);
    cm.on('change', updateState);
    // cm.on('copy', (cm, e) => {
    //   // ignore copy by codemirror.  and will copy by browser
    //   // e.codemirrorIgnore = true;
    //   console.log(e);
    // });
    setReadOnly(cm, readOnly, 50);
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
    if (editor) {
      editor.setValue(content?.content || '');
      editor.clearHistory();
    }
  }, [content]);

  useEffect(() => {
    if (!editor) return;
    setReadOnly(editor, readOnly);
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getValue() {
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
