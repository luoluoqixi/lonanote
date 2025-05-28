import { captionIcon, confirmIcon, imageIcon } from '../../icons';
import { DefineFeature, Icon } from './../types';
import { defaultImageBlockConfig, imageBlockComponent, imageBlockConfig } from './image-block';
import { imageInlineComponent, inlineImageConfig } from './image-inline';
import { ImageMenuConfig, defineImageMenu } from './image-menu';

interface ImageConfig {
  uploadLoadingText: string;
  onUpload: (file: File) => Promise<string>;
  proxyDomURL: (url: string) => Promise<string> | string;

  inlineImageIcon: Icon;
  inlineConfirmButton: Icon;
  inlineUploadButton: Icon;
  inlineUploadPlaceholderText: string;
  inlineOnUpload: (file: File) => Promise<string>;

  blockImageIcon: Icon;
  blockCaptionIcon: Icon;
  blockConfirmButton: Icon;
  blockUploadButton: Icon;
  blockUploadPlaceholderText: string;
  blockOnUpload: (file: File) => Promise<string>;

  // ==== 修改 ====
  blockResizeIcon: Icon;
  blockOperationIcon: Icon;

  imageMenu: ImageMenuConfig;
}

export type ImageFeatureConfig = Partial<ImageConfig>;

export const defineImage: DefineFeature<ImageFeatureConfig> = (editor, config) => {
  defineImageMenu(editor, config?.imageMenu);
  editor
    .config((ctx) => {
      ctx.update(inlineImageConfig.key, (value) => ({
        uploadButton: config?.inlineUploadButton ?? (() => 'Upload'),
        imageIcon: config?.inlineImageIcon ?? (() => imageIcon),
        confirmButton: config?.inlineConfirmButton ?? (() => confirmIcon),
        uploadPlaceholderText: config?.inlineUploadPlaceholderText ?? 'or paste link',
        onUpload: config?.inlineOnUpload ?? config?.onUpload ?? value.onUpload,
        proxyDomURL: config?.proxyDomURL,
      }));
      ctx.update(imageBlockConfig.key, (value) => ({
        uploadButton: config?.blockUploadButton ?? (() => 'Upload file'),
        imageIcon: config?.blockImageIcon ?? (() => imageIcon),
        captionIcon: config?.blockCaptionIcon ?? (() => captionIcon),
        confirmButton: config?.blockConfirmButton ?? (() => 'Confirm'),
        uploadPlaceholderText: config?.blockUploadPlaceholderText ?? 'or paste link',
        onUpload: config?.blockOnUpload ?? config?.onUpload ?? value.onUpload,
        proxyDomURL: config?.proxyDomURL,

        // ==== 修改 ====
        operationIcon: config?.blockOperationIcon ?? defaultImageBlockConfig.operationIcon,
        resizeIcon: config?.blockResizeIcon ?? defaultImageBlockConfig.resizeIcon,
      }));
    })
    .use(imageBlockComponent)
    .use(imageInlineComponent);

  return config;
};
