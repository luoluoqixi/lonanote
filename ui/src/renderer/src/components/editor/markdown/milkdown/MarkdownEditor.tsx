import { editorViewCtx } from '@milkdown/core';
import { Ctx } from '@milkdown/kit/ctx';
import path from 'path-browserify-esm';
import {
  Ref,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import { dialog } from '@/components/utils';
import { useEditor } from '@/controller/editor';
import { utils } from '@/utils';

import { useCodeMirrorTheme } from '../../codemirror';
import { MarkdownEditorProps, MarkdownEditorRef } from '../types';
import { MilkdownEditor, MilkdownFeature, useMilkdownEditor } from './editor';
import { ImageMenuKey } from './editor/features/image/image-menu';
import { markdownEditorLanguages } from './languages';

export interface UpdateState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const {
    className,
    style,
    filePath,
    readOnly,
    onSave,
    onUpdateListener,
    onClickAnyLink,
    mediaRootPath,
  } = props;
  const theme = useCodeMirrorTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const content = useEditor((s) => s.currentEditorContent);

  const [updateContentState, setUpdateContentState] = useState<boolean>(false);
  const updateContent = useCallback(
    () => setUpdateContentState(!updateContentState),
    [updateContentState],
  );

  const { getEditor, loading } = useMilkdownEditor(() => {
    if (!editorRef.current) return null;
    const editor = new MilkdownEditor({
      root: editorRef.current,
      defaultReadOnly: readOnly,
      defaultValue: '',
      featureConfigs: {
        [MilkdownFeature.Image]: {
          proxyDomURL(url) {
            if (!url) return url;
            // console.log(url);
            if (utils.isImgUrl(url)) {
              return url;
            }
            const f = path.resolve(mediaRootPath, url);
            return utils.getMediaPath(f);
          },
          imageMenu: {
            title: markdownEditorLanguages.imageMenuTitle,
            defaultMenuOptions: {
              [ImageMenuKey.Preview]: {
                label: markdownEditorLanguages.imageMenuPreview,
              },
              [ImageMenuKey.UploadImage]: {
                label: markdownEditorLanguages.imageMenuUploadImage,
              },
              [ImageMenuKey.EditImage]: {
                label: markdownEditorLanguages.imageMenuEditImage,
              },
              [ImageMenuKey.EditCaption]: {
                label: markdownEditorLanguages.imageMenuEditCaption,
              },
              [ImageMenuKey.DownloadImage]: {
                label: markdownEditorLanguages.imageMenuDownload,
              },
            },
            onMenuClick: (option, index, ctx, info) => {
              const key = option.key;
              if (key === ImageMenuKey.EditImage) {
                const val = info?.imageUrl || '';
                dialog.showInputDialog(markdownEditorLanguages.imageMenuEditImage, val, (v) => {
                  if (info?.setImageUrl) {
                    info.setImageUrl(v || '');
                    console.log('set img url: ', v);
                  }
                });
                return true;
              } else if (key === ImageMenuKey.EditCaption) {
                const val = info?.caption || '';
                dialog.showInputDialog(markdownEditorLanguages.imageMenuEditCaption, val, (v) => {
                  if (info?.setCaption) {
                    info.setCaption(v || '');
                  }
                });
                return true;
              } else if (key === ImageMenuKey.DownloadImage) {
                return true;
              }
              return false;
            },
          },
        },
        [MilkdownFeature.CodeMirror]: {
          theme,
        },
        [MilkdownFeature.Yaml]: {
          theme,
        },
        [MilkdownFeature.LinkTooltip]: {
          onClickLink: onClickAnyLink,
          onCopyLink(link) {
            if (navigator.clipboard && link) {
              navigator.clipboard.writeText(link).catch((e) => {
                throw e;
              });
              toast.success('复制成功');
            }
          },
        },
      },
    });

    let updateTimeId: number | null = null;
    const updateState = (ctx: Ctx) => {
      if (updateTimeId) {
        clearTimeout(updateTimeId);
        updateTimeId = null;
      }
      updateTimeId = window.setTimeout(() => {
        if (!editor || !ctx) return;
        if (!ctx.isInjected(editorViewCtx)) {
          return;
        }
        const view = ctx.get(editorViewCtx);
        onUpdateListener?.({ charCount: view.state.doc.content.size });
      }, 200);
    };
    editor.addListener('onSave', () => {
      if (!editor) return true;
      const mdText = editor.getMarkdown();
      // console.log(mdText);
      onSave?.(mdText);
      return true;
    });
    editor.addListener('onDestroy', () => {
      onUpdateListener?.(null);
    });
    editor.addListener('onCreated', () => {
      updateContent();
    });
    editor.addListener('onUpdate', (ctx) => {
      updateState(ctx);
    });
    editor.addListener('onMounted', (ctx) => {
      updateState(ctx);
    });
    editor.addListener('onLinkClick', (link, view, e) => {
      if (!view.editable) {
        e.preventDefault();
        onClickAnyLink?.(link);
      }
    });
    console.log('milkdown create');
    return editor;
  }, [filePath, onSave, onUpdateListener, onClickAnyLink, theme]);

  useEffect(() => {
    const editor = getEditor();
    if (!editor) return;
    editor.setReadonly(readOnly || false);
  }, [readOnly]);

  useEffect(() => {
    const editor = getEditor();
    if (editor) {
      try {
        editor.setMarkdown(content?.content || '', false);
      } catch (e: any) {
        toast.error(`setValue error: ${e.message}`);
      }
    }
  }, [content, updateContent]);

  useImperativeHandle(ref, () => ({
    getValue() {
      return getEditor()?.getMarkdown();
    },
    setValue(content) {
      const editor = getEditor();
      if (editor) {
        editor.setMarkdown(content || '', false);
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
