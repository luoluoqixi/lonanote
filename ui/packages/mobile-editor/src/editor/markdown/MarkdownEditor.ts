import markdownEditorLanguages from 'lonanote-languages/zh/markdown_editor_languages.json';
import { ImageMenuKey, MilkdownEditor, MilkdownFeature } from 'lonanote-markdown-editor';

import { codemirrorLightTheme } from '../codemirror/theme';
import { utils } from '../utils';
import './MarkdownEditor.scss';
import './theme/theme.scss';

export const create = (root: HTMLElement) => {
  const theme = codemirrorLightTheme;
  const editor = new MilkdownEditor({
    root,
    defaultReadOnly: false,
    defaultValue: 'default value',
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
  editor.create();
  return editor;
};
