import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
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
}

export interface UpdateState {
  charCount: number;
  rowIndex: number;
  colIndex: number;
}

export interface CodeMirrorEditorProps {
  fileName: string;
  style?: CSSProperties;
  className?: string;
  readOnly?: boolean;
  getInitContent?: () => string;
  onSave?: (content: string) => void;
  onUpdateListener?: (state: UpdateState) => void;
}

export default forwardRef((props: CodeMirrorEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { className, style, fileName, readOnly, getInitContent, onSave, onUpdateListener } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [getCrepe, updateCrepe] = useState<(() => Crepe | undefined) | null>(null);

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    setLoading(true);
    const defaultValue = getInitContent?.();
    const crepe = new Crepe({
      root: editorRef.current,
      defaultValue,
    });
    crepe.setReadonly(readOnly || false);
    crepe.create().then(() => {
      // 上一个编辑器销毁时可能还会还会短暂占用dom导致鼠标在div上move时有一些事件报错, 延迟一点点时间解决
      setTimeout(() => setLoading(false), 50);
    });
    updateCrepe(() => () => crepe);
    return () => {
      updateCrepe(null);
      if (crepe) crepe.destroy();
    };
  }, [fileName]);

  useEffect(() => {
    if (!getCrepe) return;
    const crepe = getCrepe();
    if (crepe) {
      crepe.setReadonly(readOnly || false);
    }
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return getCrepe?.()?.getMarkdown();
    },
  }));

  return (
    <div
      style={{
        display: loading ? 'none' : undefined,
        ...style,
      }}
      className={className}
      ref={editorRef}
    />
  );
});
