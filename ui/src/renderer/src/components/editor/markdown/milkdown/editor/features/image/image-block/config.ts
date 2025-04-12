import { $ctx } from '@milkdown/utils';
import { html } from 'atomico';

import { operationIcon, resizeIcon } from '../../../icons';
import { withMeta } from '../../../utils';

export interface ImageBlockConfig {
  imageIcon: () => ReturnType<typeof html> | string | HTMLElement;
  operationIcon: () => ReturnType<typeof html> | string | HTMLElement;
  resizeIcon: () => ReturnType<typeof html> | string | HTMLElement;
  uploadButton: () => ReturnType<typeof html> | string | HTMLElement;
  confirmButton: () => ReturnType<typeof html> | string | HTMLElement;
  uploadPlaceholderText: string;
  onUpload: (file: File) => Promise<string>;
  proxyDomURL?: (url: string) => Promise<string> | string;
}

export const defaultImageBlockConfig: ImageBlockConfig = {
  imageIcon: () => '🌌',
  operationIcon: () => operationIcon,
  uploadButton: () => html`
    Upload file
  `,
  confirmButton: () => html`
    Confirm ⏎
  `,
  resizeIcon: () => resizeIcon,
  uploadPlaceholderText: 'or paste the image link ...',
  onUpload: (file) => Promise.resolve(URL.createObjectURL(file)),
};

export const imageBlockConfig = $ctx(defaultImageBlockConfig, 'imageBlockConfigCtx');

withMeta(imageBlockConfig, {
  displayName: 'Config<image-block>',
  group: 'ImageBlock',
});
