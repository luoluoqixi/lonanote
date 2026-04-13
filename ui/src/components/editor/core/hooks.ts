import { LonaEditor } from 'lonanote-editor';
import { useLayoutEffect, useRef, useState } from 'react';

export type InitEditorCallback = () => LonaEditor | null;
export type DestroyEditorCallback = (editor: LonaEditor | null) => void;

export const useLonaEditor = (initEditor: InitEditorCallback, deps?: React.DependencyList) => {
  const editorRef = useRef<LonaEditor | null>(null);
  const [loading, setLoading] = useState(true);
  useLayoutEffect(() => {
    if (!initEditor) return;
    let editor = initEditor();
    if (!editor) return;
    setLoading(true);
    editorRef.current = editor;

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
