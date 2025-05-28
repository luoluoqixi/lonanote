import VideoView from './VideoView';

export * from './VideoView';

export { VideoView };

/** 支持的扩展名 */
export const supportVideoExts = [
  'mp4',
  'webm',
  'ogg',
  'ogv',
  'avi',
  'mkv',
  'flv',
  'mov',
  'wmv',
] as const;

export const isSupportVideoView = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportVideoExts.findIndex((x) => x === extName) >= 0;
};
