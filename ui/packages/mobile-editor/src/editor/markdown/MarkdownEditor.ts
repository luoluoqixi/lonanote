import markdownEditorLanguages from 'lonanote-languages/zh/markdown_editor_languages.json';
import { ImageMenuKey, MarkdownEditor, MarkdownFeature } from 'lonanote-markdown-editor';
import 'lonanote-styles/common-milkdown-theme.scss';

import { codemirrorLightTheme } from '../codemirror/theme';
import { utils } from '../utils';
import './MarkdownEditor.scss';

export const create = (root: HTMLElement, contentJson: string) => {
  const theme = codemirrorLightTheme;
  const editor = new MarkdownEditor({
    root,
    defaultReadOnly: false,
    defaultValue: contentJson,
    features: {
      [MarkdownFeature.BlockEdit]: false,
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
  editor.create();
  return editor;
};
