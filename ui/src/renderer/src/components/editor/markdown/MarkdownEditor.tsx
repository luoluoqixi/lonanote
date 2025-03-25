import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import {
  CSSProperties,
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

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
  const isFirstRender = useRef(true);
  const [loading, setLoading] = useState(false);
  const [update, setUpdata] = useState(false);
  const [getCrepe, updateCrepe] = useState<(() => Crepe | undefined) | null>(null);

  const create = (isUpdate: boolean) => {
    if (!editorRef.current) return;
    setLoading(true);
    const lastCrepe = getCrepe?.();
    const defaultValue = isUpdate && lastCrepe ? lastCrepe.getMarkdown() : getInitContent?.();
    updateCrepe(null);
    const crepe = new Crepe({
      root: editorRef.current,
      defaultValue,
    });
    crepe.setReadonly(readOnly || false);
    crepe.create().then(() => {
      setTimeout(() => setLoading(false), 50);
    });
    updateCrepe(() => () => crepe);
    return () => {
      console.log('销毁');
      if (crepe) crepe.destroy();
    };
  };
  useLayoutEffect(() => create(false), [update]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return getCrepe?.()?.getMarkdown();
    },
  }));

  return (
    <div
      style={{
        display: loading ? 'none' : undefined,
      }}
      ref={editorRef}
    />
  );
});
