import { Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { commandsCtx, editorViewCtx, editorViewOptionsCtx, parserCtx } from '@milkdown/core';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
// import { emoji } from '@milkdown/plugin-emoji';
import { Uploader, upload, uploadConfig } from '@milkdown/plugin-upload';
import type { Node } from '@milkdown/prose/model';
import { Decoration } from '@milkdown/prose/view';
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

import { useCodeMirrorTheme } from '../../codemirror';
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

const defaultUploader: Uploader = async (files, schema) => {
  const imgs: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files.item(i);
    if (!file) continue;
    if (!file.type.includes('image')) continue;
    imgs.push(file);
  }
  const { image } = schema.nodes;
  if (!image) throw new Error('Missing node in schema, milkdown cannot find "image" in schema.');
  // TODO 上传图片
  const data = await Promise.all(
    imgs.map((img) => ({
      src: '',
      alt: '',
    })),
  );
  return data.map(({ alt, src }) => image.createAndFill({ src, alt }) as Node);
};

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const { className, style, filePath, readOnly, onSave, onUpdateListener, mediaRootPath } = props;
  const theme = useCodeMirrorTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const editor = useRef<Crepe | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [readOnlyEx, setReadOnlyEx] = useState<Compartment | null>(null);

  const content = useEditor((s) => s.currentEditorContent);
  const [updateContentState, setUpdateContentState] = useState<boolean>(false);

  const updateContent = useCallback(
    () => setUpdateContentState(!updateContentState),
    [updateContentState],
  );

  useLayoutEffect(() => {
    if (!editorRef.current) return;
    const readOnlyEx = new Compartment();
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
            console.log(originalURL);
            if (utils.isImgUrl(originalURL)) {
              return originalURL;
            }
            const f = path.resolve(mediaRootPath, originalURL);
            return utils.getMediaPath(f);
          },
        },
        [Crepe.Feature.BlockEdit]: {
          handleAddIcon: undefined,
        },
        [Crepe.Feature.CodeMirror]: {
          extensions: [readOnlyEx.of(EditorView.editable.of(readOnly ? false : true))],
          theme,
        },
      },
    });

    crepe.editor.use(upload).config((ctx) => {
      ctx.set(uploadConfig.key, {
        uploader: defaultUploader,
        enableHtmlFileUploader: false,
        uploadWidgetFactory: (pos, spec) => {
          const widgetDOM = document.createElement('span');
          widgetDOM.textContent = '上传文件...';
          return Decoration.widget(pos, widgetDOM, spec);
        },
      });
    });

    // crepe 目前不支持 diagram
    // https://github.com/orgs/Milkdown/discussions/1733
    // crepe.editor.use(diagram).config((ctx) => {
    //   ctx.set(mermaidConfigCtx.key, {});
    // });

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
    setReadOnlyEx(readOnlyEx);
    console.log('milkdown create');

    return () => {
      setLoading(false);
      editor.current = null;
      onUpdateListener?.(null);
      setReadOnlyEx(null);
      if (crepe) {
        crepe.destroy();
        crepe = null;
      }
    };
  }, [filePath, onSave, onUpdateListener, theme]);

  useEffect(() => {
    if (!editor.current) return;
    editor.current.setReadonly(readOnly || false);
    if (!readOnlyEx) return;
    // 切换所有CodeMirror的ReadOnly
    editor.current.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const cmEditors = view.dom.querySelectorAll('.cm-editor');
      if (cmEditors && cmEditors.length && cmEditors.length > 0) {
        for (const cmEditor of cmEditors) {
          if (!cmEditor) continue;
          const cmView = cmEditor && EditorView.findFromDOM(cmEditor as HTMLElement);
          if (cmView) {
            cmView.dispatch({
              effects: readOnlyEx.reconfigure(EditorView.editable.of(readOnly ? false : true)),
            });
          }
        }
      }
    });
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
