import { MarkdownFeature } from '..';
import { featureConfig } from '../../core/slice';
import { confirmIcon, imageIcon } from '../../icons';
import { DefineFeature } from './../types';
import { defaultImageBlockConfig, imageBlockComponent, imageBlockConfig } from './image-block';
import { imageInlineComponent, inlineImageConfig } from './image-inline';
import { ImageMenuConfig, defineImageMenu } from './image-menu';

interface ImageConfig {
  uploadLoadingText: string;
  onUpload: (file: File) => Promise<string>;
  proxyDomURL: (url: string) => Promise<string> | string;

  inlineImageIcon: string;
  inlineConfirmButton: string;
  inlineUploadButton: string;
  inlineUploadPlaceholderText: string;
  inlineOnUpload: (file: File) => Promise<string>;

  blockImageIcon: string;
  blockConfirmButton: string;
  blockUploadButton: string;
  blockUploadPlaceholderText: string;
  blockOnUpload: (file: File) => Promise<string>;

  // ==== 修改 ====
  blockResizeIcon: string;
  blockOperationIcon: string;

  imageMenu: ImageMenuConfig;
}

export type ImageFeatureConfig = Partial<ImageConfig>;

export const defineImage: DefineFeature<ImageFeatureConfig> = (editor, config) => {
  defineImageMenu(editor, config?.imageMenu);
  editor
    .config(featureConfig(MarkdownFeature.Image))
    .config((ctx) => {
      ctx.update(inlineImageConfig.key, (value) => ({
        uploadButton: config?.inlineUploadButton ?? 'Upload',
        imageIcon: config?.inlineImageIcon ?? imageIcon,
        confirmButton: config?.inlineConfirmButton ?? confirmIcon,
        uploadPlaceholderText: config?.inlineUploadPlaceholderText ?? 'or paste link',
        onUpload: config?.inlineOnUpload ?? config?.onUpload ?? value.onUpload,
        proxyDomURL: config?.proxyDomURL,
      }));
      ctx.update(imageBlockConfig.key, (value) => ({
        uploadButton: config?.blockUploadButton ?? 'Upload file',
        imageIcon: config?.blockImageIcon ?? imageIcon,
        confirmButton: config?.blockConfirmButton ?? 'Confirm',
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
