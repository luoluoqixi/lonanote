import { useLayoutEffect, useRef, useState } from 'react';

import { MilkdownEditor } from './editor';

export type InitEditorCallback = () => MilkdownEditor | null;
export type DestroyEditorCallback = (editor: MilkdownEditor | null) => void;

export const useMilkdownEditor = (
  initEditor: InitEditorCallback,
  onDestroy?: DestroyEditorCallback,
  deps?: React.DependencyList,
) => {
  const editorRef = useRef<MilkdownEditor | null>(null);
  const [loading, setLoading] = useState(true);
  useLayoutEffect(() => {
    if (!initEditor) return;
    let editor = initEditor();
    if (!editor) return;
    setLoading(true);
    editor
      .create()
      .then(() => {
        editorRef.current = editor;
      })
      .finally(() => {
        // 上一个编辑器销毁时可能还会还会短暂占用dom导致鼠标在div上move时有一些事件报错, 延迟一点点时间解决
        setTimeout(() => setLoading(false), 50);
        // setLoading(false);
      })
      .catch(console.error);

    return () => {
      setLoading(false);
      editorRef.current = null;
      if (onDestroy) onDestroy(editor);
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
