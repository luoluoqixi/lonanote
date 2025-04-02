import { commandsCtx, editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { $command, $useKeymap } from '@milkdown/utils';
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
  const { className, style, fileName, readOnly, onSave, onUpdateListener } = props;
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useRef<Crepe | null>(null);

  const [content, setContent] = useState<string | null>(null);
  const [updateContentState, setUpdateContentState] = useState<boolean>(false);

  const updateContent = useCallback(
    () => setUpdateContentState(!updateContentState),
    [updateContentState],
  );

  useLayoutEffect(() => {
    if (!editorRef.current) return;
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
        // setTimeout(() => setLoading(false), 50);
        if (crepe != null) {
          editor.current = crepe;
          updateContent();
          console.log('milkdown inited');
        }
      });
    console.log('milkdown create');

    return () => {
      editor.current = null;
      onUpdateListener?.(null);
      if (crepe) {
        crepe.destroy();
        crepe = null;
      }
    };
  }, [fileName, onSave, onUpdateListener]);

  useEffect(() => {
    if (!editor.current) return;
    editor.current.setReadonly(readOnly || false);
  }, [readOnly]);

  useEffect(() => {
    if (editor.current) {
      // console.log('value', editor, content);
      setMarkdownValue(editor.current, content || '', false);
    }
  }, [content, updateContent]);

  useImperativeHandle(ref, () => ({
    getMarkdown() {
      return editor.current?.getMarkdown();
    },
    setValue(content) {
      try {
        setContent(content);
      } catch (e) {
        console.error('setValue error:', e);
      }
    },
  }));

  return (
    <div
      style={{
        display: editor == null ? 'none' : undefined,
        ...style,
      }}
      className={className}
      ref={editorRef}
    />
  );
});
