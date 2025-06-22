import { $ctx } from '@milkdown/utils';

import { operationIcon, resizeIcon } from '../../../icons';
import { withMeta } from '../../../utils';

export interface ImageBlockConfig {
  imageIcon: string | undefined;
  uploadButton: string | undefined;
  confirmButton: string | undefined;
  uploadPlaceholderText: string;
  onUpload: (file: File) => Promise<string>;
  proxyDomURL?: (url: string) => Promise<string> | string;

  operationIcon: string;
  resizeIcon: string;
}

export const defaultImageBlockConfig: ImageBlockConfig = {
  imageIcon: '🌌',
  uploadButton: 'Upload file',
  confirmButton: 'Confirm ⏎',
  uploadPlaceholderText: 'or paste the image link ...',
  onUpload: (file) => Promise.resolve(URL.createObjectURL(file)),

  operationIcon,
  resizeIcon,
};

export const imageBlockConfig = $ctx(defaultImageBlockConfig, 'imageBlockConfigCtx');

withMeta(imageBlockConfig, {
  displayName: 'Config<image-block>',
  group: 'ImageBlock',
});
