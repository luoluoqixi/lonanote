import {
  Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import 'vditor/dist/js/i18n/zh_CN';

import { MarkdownEditorProps, MarkdownEditorRef } from '../types';
import './MarkdownEditor.scss';

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { editorId, className, style, readOnly, onSave, onUpdateListener } = props;

  const [content, setContent] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Vditor | null>(null);
  useLayoutEffect(() => {
    if (!editorRef.current) return;
    onUpdateListener?.(null);
    let vditor: Vditor | null = new Vditor(editorRef.current, {
      cache: {
        id: editorId,
      },
      toolbar: [],
      i18n: window.VditorI18n,
      cdn: 'libs/vditor',
      theme: 'classic',
      mode: 'ir',
      after: () => {
        vditor?.setValue('');
        setEditor(vditor);
      },
    });
    console.log('vditor create');
    return () => {
      vditor?.destroy();
      vditor = null;
      setEditor(null);
      onUpdateListener?.(null);
    };
  }, [onSave, onUpdateListener]);

  useEffect(() => {
    if (!editor) return;
  }, [readOnly]);

  useEffect(() => {
    if (editor) {
      editor.setValue(content || '');
      editor.clearStack();
    }
  }, [editor, content]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return editor?.getValue();
    },
    setValue(content, useHistory) {
      try {
        setContent(content);
        editor?.setValue(content);
        if (!useHistory) {
          editor?.clearStack();
        }
      } catch (e) {
        console.error('setValue error:', e);
      }
    },
  }));

  return <div ref={editorRef} className={className} style={style} />;
});
