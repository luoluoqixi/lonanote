import { EditorView } from '@codemirror/view';
import { commandsCtx, editorViewOptionsCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { $command, $useKeymap } from '@milkdown/utils';
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
      features: {
        placeholder: false,
      },
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: {
          proxyDomURL: (originalURL: string) => {
            console.log(originalURL);
            return originalURL;
          },
        },
        [Crepe.Feature.BlockEdit]: {
          handleAddIcon: undefined,
        },
      },
    });

    const saveCommand = $command('saveCommand', () => () => {
      return () => {
        const mdText = crepe.getMarkdown();
        // console.log(mdText);
        onSave?.(mdText);
        return true;
      };
    });
    const saveKeyMap = $useKeymap('saveKeymap', {
      saveDescription: {
        shortcuts: 'Ctrl-s',
        command: (ctx) => {
          const commands = ctx.get(commandsCtx);
          return () => commands.call(saveCommand.key);
        },
      },
    });
    crepe.editor.use([saveCommand, saveKeyMap].flat());

    crepe.on((listener) => {
      // listener.markdownUpdated((ctx, md, prevMd) => {
      //   console.log(ctx, md, prevMd);
      // });
      listener.updated((ctx, doc, prevDoc) => {
        console.log(ctx, doc, prevDoc);
        // const editorView = crepe.editor.ctx.get(editorViewCtx);
      });
    });

    crepe.editor.config((ctx) => {
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          spellcheck: 'false',
        },
      }));
    });
    crepe
      .setReadonly(readOnly || false)
      .create()
      .then(() => {
        // 上一个编辑器销毁时可能还会还会短暂占用dom导致鼠标在div上move时有一些事件报错, 延迟一点点时间解决
        setTimeout(() => setLoading(false), 50);
      });
    updateCrepe(() => () => crepe);
    return () => {
      updateCrepe(null);
      if (crepe) crepe.destroy();
    };
  }, [fileName, onSave, onUpdateListener]);

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
