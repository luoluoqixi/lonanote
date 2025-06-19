import { editorViewCtx } from '@milkdown/core';
import { Ctx } from '@milkdown/kit/ctx';
import markdownEditorLanguages from 'lonanote-languages/zh/markdown_editor_languages.json';
import { ImageMenuKey, MilkdownEditor, MilkdownFeature } from 'lonanote-markdown-editor';
import path from 'path-browserify-esm';
import { Ref, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { LuClipboardPaste } from 'react-icons/lu';
import { TbCopy, TbCut, TbSelectAll } from 'react-icons/tb';
import { toast } from 'react-toastify';

import { fs, system } from '@/bindings/api';
import { ContextMenu, ContextMenuItem, ContextMenuRef } from '@/components';
import { dialog } from '@/components/utils';
import { utils } from '@/utils';

import { useCodeMirrorTheme } from '../../codemirror';
import { MarkdownEditorProps, MarkdownEditorRef } from '../types';
import { useMilkdownEditor } from './hooks';

export interface UpdateState {
  charCount: number;
  rowIndex?: number;
  colIndex?: number;
}

const contextMenus: ContextMenuItem[] = [
  {
    id: 'cut',
    label: '剪切',
    icon: <TbCut />,
  },
  {
    id: 'copy',
    label: '复制',
    icon: <TbCopy />,
  },
  {
    id: 'paste',
    label: '粘贴',
    icon: <LuClipboardPaste />,
  },
  {
    id: 'select-all',
    label: '全选',
    icon: <TbSelectAll />,
  },
];

export default forwardRef((props: MarkdownEditorProps, ref: Ref<MarkdownEditorRef>) => {
  const {
    className,
    style,
    filePath,
    initValue,
    readOnly,
    onSave,
    onFocusChange,
    onUpdateStateListener,
    onUpdate,
    onClickAnyLink,
    mediaRootPath,
    workspaceRootPath,
    defaultUploadPath,
  } = props;
  const theme = useCodeMirrorTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<ContextMenuRef>(null);

  const { getEditor, loading } = useMilkdownEditor(() => {
    if (!editorRef.current) return null;
    const editor = new MilkdownEditor({
      root: editorRef.current,
      defaultReadOnly: readOnly,
      defaultValue: initValue || '',
      featureConfigs: {
        [MilkdownFeature.Image]: {
          blockUploadPlaceholderText: markdownEditorLanguages.imageBlockUploadPlaceholderText,
          blockUploadButton: () => markdownEditorLanguages.imageBlockUploadButton,
          blockConfirmButton: () => markdownEditorLanguages.imageBlockConfirmButton,
          inlineUploadPlaceholderText: markdownEditorLanguages.imageInlineUploadPlaceholderText,
          inlineUploadButton: () => markdownEditorLanguages.imageInlineUploadButton,
          proxyDomURL: async (url) => {
            if (!url) return url;
            // console.log(url);
            if (utils.isImgUrl(url)) {
              return url;
            }
            const f = path.resolve(mediaRootPath, url);
            if (!(await fs.exists(f))) {
              const f = path.resolve(path.resolve(workspaceRootPath, defaultUploadPath), url);
              if (await fs.exists(f)) {
                return utils.getMediaPath(f);
              }
            }
            return utils.getMediaPath(f);
          },
          onUpload: async (file) => {
            const arrayBuffer = await file.arrayBuffer();
            const exname = path.extname(file.name);
            let filePath = path.join(workspaceRootPath, defaultUploadPath, file.name);
            let basename = path.basename(file.name);
            while (true) {
              if (await fs.exists(filePath)) {
                basename = `${basename}-1`;
                filePath = path.join(workspaceRootPath, defaultUploadPath, `${basename}${exname}`);
              } else {
                break;
              }
            }
            await fs.writeBinary(filePath, arrayBuffer);
            const resultPath = path.relative(mediaRootPath, filePath);
            return resultPath;
          },
          uploadLoadingText: markdownEditorLanguages.imageUploadLoadingText,
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
              const imgUrl = info?.imageUrl || '';
              if (key === ImageMenuKey.EditImage) {
                let val = imgUrl;
                if (utils.isMedialogPath(imgUrl)) {
                  val = utils.getMedialogOriginPath(imgUrl);
                  if (val.startsWith(workspaceRootPath)) {
                    val = path.relative(mediaRootPath, val);
                  } else {
                    console.warn('未知的路径:', val, workspaceRootPath);
                  }
                }
                dialog.showInputDialog(markdownEditorLanguages.imageMenuEditImage, val, (v) => {
                  if (info?.setImageUrl) {
                    info.setImageUrl(v || '');
                    console.log('set img url: ', v);
                  }
                  return true;
                });
                return true;
              } else if (key === ImageMenuKey.EditCaption) {
                const val = info?.caption || '';
                dialog.showInputDialog(markdownEditorLanguages.imageMenuEditCaption, val, (v) => {
                  if (info?.setCaption) {
                    info.setCaption(v || '');
                  }
                  return true;
                });
                return true;
              } else if (key === ImageMenuKey.DownloadImage) {
                if (utils.isMedialogPath(imgUrl)) {
                  const fullPath = utils.getMedialogOriginPath(imgUrl);
                  fs.showSelectDialog({
                    type: 'saveFile',
                    title: '保存图片',
                    defaultFileName: path.basename(fullPath),
                  }).then((path) => {
                    if (!path) return;
                    fs.copy(fullPath, path as string, true)
                      .then(() => {
                        toast.success(`成功保存: ${path}`);
                      })
                      .catch((e) => {
                        console.error(e);
                        toast.error(`保存失败: ${e}`);
                      });
                  });
                } else {
                  if (imgUrl !== '') {
                    const url = new URL(imgUrl);
                    const names = url.pathname.split('/');
                    const n = names[names.length - 1];
                    const defaultName = n || info?.caption || '';
                    fs.showSelectDialog({
                      type: 'saveFile',
                      title: '保存图片',
                      defaultFileName: defaultName,
                    }).then((path) => {
                      if (!path) return;
                      const id = toast.loading('保存中...');
                      fs.saveImageUrlToFile(imgUrl, path as string)
                        .then(() => {
                          toast.dismiss(id);
                          toast.success(`成功保存: ${path}`);
                        })
                        .catch((e) => {
                          toast.dismiss(id);
                          console.error(e);
                          toast.error(`保存失败: ${e}`);
                        });
                    });
                  } else {
                    toast.warn('没有图片可保存');
                  }
                }
                return true;
              }
              return false;
            },
          },
        },
        [MilkdownFeature.CodeMirror]: {
          theme,
          searchPlaceholder: markdownEditorLanguages.codemirrorSearchPlaceholder,
          previewToggleText: (m) =>
            m
              ? markdownEditorLanguages.codemirrorToggleEdit
              : markdownEditorLanguages.codemirrorToggleHide,
          previewLabel: () => markdownEditorLanguages.codemirrorPreviewLabel,
          noResultText: markdownEditorLanguages.codemirrorNoResultText,
        },
        [MilkdownFeature.Yaml]: {
          theme,
        },
        [MilkdownFeature.LinkTooltip]: {
          onClickLink: onClickAnyLink,
          inputPlaceholder: markdownEditorLanguages.linkTooltipInputLinkLabel,
          onCopyLink(link) {
            if (navigator.clipboard && link) {
              navigator.clipboard.writeText(link).catch((e) => {
                throw e;
              });
              toast.success('复制成功');
            }
          },
        },
        [MilkdownFeature.BlockEdit]: {
          slashMenuTextGroupLabel: markdownEditorLanguages.slashMenuTextGroupLabel,
          slashMenuH1Label: markdownEditorLanguages.slashMenuH1Label,
          slashMenuH2Label: markdownEditorLanguages.slashMenuH2Label,
          slashMenuH3Label: markdownEditorLanguages.slashMenuH3Label,
          slashMenuH4Label: markdownEditorLanguages.slashMenuH4Label,
          slashMenuH5Label: markdownEditorLanguages.slashMenuH5Label,
          slashMenuH6Label: markdownEditorLanguages.slashMenuH6Label,
          slashMenuQuoteLabel: markdownEditorLanguages.slashMenuQuoteLabel,
          slashMenuDividerLabel: markdownEditorLanguages.slashMenuDividerLabel,

          slashMenuListGroupLabel: markdownEditorLanguages.slashMenuListGroupLabel,
          slashMenuBulletListLabel: markdownEditorLanguages.slashMenuBulletListLabel,
          slashMenuOrderedListLabel: markdownEditorLanguages.slashMenuOrderedListLabel,
          slashMenuTaskListLabel: markdownEditorLanguages.slashMenuTaskListLabel,

          slashMenuAdvancedGroupLabel: markdownEditorLanguages.slashMenuAdvancedGroupLabel,
          slashMenuImageLabel: markdownEditorLanguages.slashMenuImageLabel,
          slashMenuImageLinkLabel: markdownEditorLanguages.slashMenuImageLinkLabel,
          slashMenuCodeBlockLabel: markdownEditorLanguages.slashMenuCodeBlockLabel,
          slashMenuTableLabel: markdownEditorLanguages.slashMenuTableLabel,
          slashMenuMathLabel: markdownEditorLanguages.slashMenuMathLabel,
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
        onUpdateStateListener?.({ charCount: view.state.doc.content.size });
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
      onUpdateStateListener?.(null);
    });
    editor.addListener('onUpdate', (ctx) => {
      onUpdate?.();
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
    editor.addListener('onMouseDown', (view, e) => {
      if (e.button === 2) {
        openMenuClick(e);
      }
    });
    editor.addListener('onFocus', () => {
      if (onFocusChange) {
        onFocusChange(true);
      }
    });
    editor.addListener('onBlur', () => {
      if (onFocusChange) {
        onFocusChange(false);
      }
    });
    // console.log('milkdown create');
    return editor;
  }, [
    filePath,
    initValue,
    onSave,
    onFocusChange,
    onUpdate,
    onUpdateStateListener,
    onClickAnyLink,
    theme,
  ]);

  useEffect(() => {
    const editor = getEditor();
    if (!editor) return;
    editor.setReadonly(readOnly || false);
  }, [readOnly]);

  useImperativeHandle(ref, () => ({
    getValue() {
      return getEditor()?.getMarkdown();
    },
    setValue(content) {
      const editor = getEditor();
      if (editor) {
        try {
          editor.setMarkdown(content || '', false);
        } catch (e: any) {
          toast.error(`setValue error: ${e.message}`);
        }
      }
    },
  }));

  const openMenuClick = (e: MouseEvent) => {
    if (menuRef.current) {
      menuRef.current.openMenu(e);
    }
  };

  const onMenuClick = async (id: string) => {
    const editor = getEditor();
    if (!editor) return;
    if (id === 'cut') {
      await system.cut();
    } else if (id === 'copy') {
      await system.copy();
    } else if (id === 'paste') {
      setTimeout(system.paste, 201);
    } else if (id === 'select-all') {
      setTimeout(system.selectAll, 201);
    }
  };

  return (
    <>
      <div
        style={{
          display: loading ? 'none' : undefined,
          ...style,
        }}
        className={className}
        ref={editorRef}
      />
      <ContextMenu
        ref={menuRef}
        items={contextMenus}
        onMenuClick={onMenuClick}
        contentWidth={150}
      />
    </>
  );
});
