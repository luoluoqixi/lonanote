import { $ctx } from '@milkdown/utils';

import { withMeta } from '../../../utils';

export interface InlineImageConfig {
  imageIcon: () => string | undefined;
  uploadButton: () => string | undefined;
  confirmButton: () => string | undefined;
  uploadPlaceholderText: string;
  onUpload: (file: File) => Promise<string>;
  proxyDomURL?: (url: string) => Promise<string> | string;
}

export const defaultInlineImageConfig: InlineImageConfig = {
  imageIcon: () => '🌌',
  uploadButton: () => 'Upload',
  confirmButton: () => '⏎',
  uploadPlaceholderText: '/Paste',
  onUpload: (file) => Promise.resolve(URL.createObjectURL(file)),
};

export const inlineImageConfig = $ctx(defaultInlineImageConfig, 'inlineImageConfigCtx');

withMeta(inlineImageConfig, {
  displayName: 'Config<image-inline>',
  group: 'ImageInline',
});
