import { confirmIcon, imageIcon } from '../../icons';
import { DefineFeature, Icon } from './../types';
import { defaultImageBlockConfig, imageBlockComponent, imageBlockConfig } from './image-block';
import { imageInlineComponent, inlineImageConfig } from './image-inline';
import { ImageMenuConfig, defineImageMenu } from './image-menu';

interface ImageConfig {
  onUpload: (file: File) => Promise<string>;
  proxyDomURL: (url: string) => Promise<string> | string;

  inlineImageIcon: Icon;
  inlineConfirmButton: Icon;
  inlineUploadButton: Icon;
  inlineUploadPlaceholderText: string;
  inlineOnUpload: (file: File) => Promise<string>;

  blockImageIcon: Icon;
  blockConfirmButton: Icon;
  blockOperationIcon: Icon;
  blockResizeIcon: Icon;
  blockUploadButton: Icon;
  blockUploadPlaceholderText: string;
  blockOnUpload: (file: File) => Promise<string>;

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
        confirmButton: config?.blockConfirmButton ?? (() => 'Confirm'),
        operationIcon: config?.blockOperationIcon ?? defaultImageBlockConfig.operationIcon,
        resizeIcon: config?.blockResizeIcon ?? defaultImageBlockConfig.resizeIcon,
        uploadPlaceholderText: config?.blockUploadPlaceholderText ?? 'or paste link',
        onUpload: config?.blockOnUpload ?? config?.onUpload ?? value.onUpload,
        proxyDomURL: config?.proxyDomURL,
      }));
    })
    .use(imageBlockComponent)
    .use(imageInlineComponent);

  return config;
};
