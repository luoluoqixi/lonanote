import ImageView from './ImageView';

export * from './ImageView';

export { ImageView };

/** 支持的扩展名 */
export const supportExts = [
  'jpg',
  'jpeg',
  'jpe',
  'jfif',
  'png',
  'gif',
  'webp',
  'svg',
  'apng',
  'bmp',
  'ico',
  'avif',
  'heif',
  'heic',
  'jxl',
  'tga',
] as const;

export const isSupportImageView = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportExts.findIndex((x) => x === extName) >= 0;
};
