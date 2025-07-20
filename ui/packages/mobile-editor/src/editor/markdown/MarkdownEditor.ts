import { editorViewCtx } from '@milkdown/core';
import { Ctx } from '@milkdown/kit/ctx';
import markdownEditorLanguages from 'lonanote-languages/zh/markdown_editor_languages.json';
import { ImageMenuKey, MarkdownEditor, MarkdownFeature } from 'lonanote-markdown-editor';
import 'lonanote-styles/common-milkdown-theme.scss';

import { onUpdateState, saveContent } from '..';
import { codemirrorDarkTheme, codemirrorLightTheme } from '../codemirror/theme';
import { utils } from '../utils';
import './MarkdownEditor.scss';

export const createMarkdownEditor = async (
  root: HTMLElement,
  content: string,
  previewMode: boolean,
) => {
  const theme = window.colorMode === 'dark' ? codemirrorDarkTheme : codemirrorLightTheme;
  const editor = new MarkdownEditor({
    root,
    defaultReadOnly: previewMode,
    defaultValue: content,
    features: {
      [MarkdownFeature.BlockEdit]: false,
      [MarkdownFeature.Toolbar]: false,
    },
    featureConfigs: {
      [MarkdownFeature.Image]: {
        blockUploadPlaceholderText: markdownEditorLanguages.imageBlockUploadPlaceholderText,
        blockUploadButton: markdownEditorLanguages.imageBlockUploadButton,
        blockConfirmButton: markdownEditorLanguages.imageBlockConfirmButton,
        inlineUploadPlaceholderText: markdownEditorLanguages.imageInlineUploadPlaceholderText,
        inlineUploadButton: markdownEditorLanguages.imageInlineUploadButton,
        proxyDomURL: async (url) => {
          if (!url) return url;
          // console.log(url);
          if (utils.isImgUrl(url)) {
            return url;
          }
          // const f = path.resolve(mediaRootPath, url);
          // if (!(await fs.exists(f))) {
          //   const f = path.resolve(path.resolve(workspaceRootPath, defaultUploadPath), url);
          //   if (await fs.exists(f)) {
          //     return utils.getMediaPath(f);
          //   }
          // }
          // return utils.getMediaPath(f);
          return url;
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
        },
      },
      [MarkdownFeature.CodeMirror]: {
        theme,
        searchPlaceholder: markdownEditorLanguages.codemirrorSearchPlaceholder,
        previewToggleText: (m) =>
          m
            ? markdownEditorLanguages.codemirrorToggleEdit
            : markdownEditorLanguages.codemirrorToggleHide,
        previewLabel: markdownEditorLanguages.codemirrorPreviewLabel,
        noResultText: markdownEditorLanguages.codemirrorNoResultText,
      },
      [MarkdownFeature.Yaml]: {
        theme,
      },
      [MarkdownFeature.LinkTooltip]: {
        // onClickLink: onClickAnyLink,
        inputPlaceholder: markdownEditorLanguages.linkTooltipInputLinkLabel,
        onCopyLink(link) {
          if (navigator.clipboard && link) {
            navigator.clipboard.writeText(link).catch((e) => {
              throw e;
            });
            console.log('复制成功');
          }
        },
      },
    },
  });
  await editor.create();

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
      onUpdateState({ charCount: view.state.doc.content.size });
    }, 200);
  };
  editor.addListener('onSave', () => {
    if (!editor) return true;
    const mdText = editor.getMarkdown();
    // console.log(mdText);
    saveContent(mdText);
    return true;
  });
  editor.addListener('onDestroy', () => {
    onUpdateState();
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
      // onClickAnyLink?.(link);
    }
  });
  editor.addListener('onFocus', () => {
    // if (onFocusChange) {
    //   onFocusChange(true);
    // }
  });
  editor.addListener('onBlur', () => {
    // if (onFocusChange) {
    //   onFocusChange(false);
    // }
  });

  return editor;
};
