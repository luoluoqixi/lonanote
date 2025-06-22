import { MarkdownEditor } from 'lonanote-markdown-editor';
import { useLayoutEffect, useRef, useState } from 'react';

export type InitEditorCallback = () => MarkdownEditor | null;
export type DestroyEditorCallback = (editor: MarkdownEditor | null) => void;

export const useMilkdownEditor = (initEditor: InitEditorCallback, deps?: React.DependencyList) => {
  const editorRef = useRef<MarkdownEditor | null>(null);
  const [loading, setLoading] = useState(true);
  useLayoutEffect(() => {
    if (!initEditor) return;
    let editor = initEditor();
    if (!editor) return;
    setLoading(true);
    editor.addListener('onCreate', () => {
      editorRef.current = editor;
    });
    editor
      .create()
      .finally(() => {
        // 上一个编辑器销毁时可能还会还会短暂占用dom导致鼠标在div上move时有一些事件报错, 延迟一点点时间解决
        setTimeout(() => setLoading(false), 50);
        // setLoading(false);
      })
      .catch(console.error);

    return () => {
      setLoading(false);
      editorRef.current = null;
      if (editor) {
        editor.destroy();
        editor = null;
      }
    };
  }, deps);

  return {
    loading,
    getEditor: () => editorRef.current,
  };
};
