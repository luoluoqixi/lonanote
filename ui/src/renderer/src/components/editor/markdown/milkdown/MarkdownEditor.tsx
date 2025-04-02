import { commandsCtx, editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { $command, $useKeymap } from '@milkdown/utils';
import path from 'path-browserify-esm';
import { Slice } from 'prosemirror-model';
import {
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useEditor } from '@/controller/editor';
import { utils } from '@/utils';

import { MarkdownEditorProps, MarkdownEditorRef } from '../types';
import './MarkdownEditor.scss';

export interface UpdateState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

const setMarkdownValue = (editor: Crepe, content: string, useHistory: boolean | undefined) => {
  try {
    // editor.editor.action((ctx) => {
    //   const view = ctx.get(editorViewCtx);
    //   view.state.tr.setMeta('addToHistory', false);
    //   replaceAll(content)(ctx);
    // });
    editor.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const parser = ctx.get(parserCtx);
      const doc = parser(content);
      if (!doc) return;
      const state = view.state;
      view.dispatch(
        state.tr
          .setMeta('addToHistory', useHistory ? true : false)
          .replace(0, state.doc.content.size, new Slice(doc.content, 0, 0)),
      );
    });
  } catch (e) {
    console.error('setValue Error', e);
  }
};

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { className, style, filePath, readOnly, onSave, onUpdateListener, mediaRootPath } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useRef<Crepe | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const content = useEditor((s) => s.currentEditorContent);
  const [updateContentState, setUpdateContentState] = useState<boolean>(false);

  const updateContent = useCallback(
    () => setUpdateContentState(!updateContentState),
    [updateContentState],
  );

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    setLoading(true);
    onUpdateListener?.(null);
    let crepe: Crepe | null = new Crepe({
      root: editorRef.current,
      defaultValue: '',
      features: {
        placeholder: false,
      },
      featureConfigs: {
        [Crepe.Feature.ImageBlock]: {
          proxyDomURL: (originalURL: string) => {
            if (!originalURL) return originalURL;
            if (originalURL.startsWith('http://') || originalURL.startsWith('https://')) {
              return originalURL;
            }
            const f = path.resolve(mediaRootPath, originalURL);
            return utils.getMediaPath(f);
          },
        },
        [Crepe.Feature.BlockEdit]: {
          handleAddIcon: undefined,
        },
      },
    });

    const saveCommand = $command('saveCommand', () => () => {
      return () => {
        if (!crepe) return true;
        const mdText = crepe.getMarkdown();
        // console.log(mdText);
        onSave?.(mdText);
        return true;
      };
    });
    const saveKeyMap = $useKeymap('saveKeymap', {
      saveDescription: {
        shortcuts: 'Mod-s',
        command: (ctx) => {
          const commands = ctx.get(commandsCtx);
          return () => commands.call(saveCommand.key);
        },
      },
    });
    crepe.editor.use([saveCommand, saveKeyMap].flat());

    crepe.editor.config((ctx) => {
      ctx.update(editorViewOptionsCtx, (prev) => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          spellcheck: 'false',
        },
        // handleDOMEvents: {
        //   pointerup: (view) => {
        //     const line = getBlockLineNumber(view.state);
        //     console.log(line);
        //   },
        // },
      }));
    });
    crepe.on((listener) => {
      listener.updated((ctx) => {
        if (!crepe) return;
        const view = ctx.get(editorViewCtx);
        onUpdateListener?.({ charCount: view.state.doc.content.size });
      });
      listener.mounted((ctx) => {
        if (!crepe) return;
        const view = ctx.get(editorViewCtx);
        onUpdateListener?.({ charCount: view.state.doc.content.size });
      });
    });
    crepe
      .setReadonly(readOnly || false)
      .create()
      .then(() => {
        // 上一个编辑器销毁时可能还会还会短暂占用dom导致鼠标在div上move时有一些事件报错, 延迟一点点时间解决
        setTimeout(() => setLoading(false), 50);
        if (crepe != null) {
          editor.current = crepe;
          updateContent();
          console.log('milkdown inited');
        }
      });
    console.log('milkdown create');

    return () => {
      setLoading(false);
      editor.current = null;
      onUpdateListener?.(null);
      if (crepe) {
        crepe.destroy();
        crepe = null;
      }
    };
  }, [filePath, onSave, onUpdateListener]);

  useEffect(() => {
    if (!editor.current) return;
    editor.current.setReadonly(readOnly || false);
  }, [readOnly]);

  useEffect(() => {
    if (editor.current) {
      // console.log('value', editor, content);
      setMarkdownValue(editor.current, content?.content || '', false);
    }
  }, [content, updateContent]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return editor.current?.getMarkdown();
    },
    setValue(content) {
      try {
        if (editor.current) {
          setMarkdownValue(editor.current, content || '', false);
        }
      } catch (e) {
        console.error('setValue error:', e);
      }
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
