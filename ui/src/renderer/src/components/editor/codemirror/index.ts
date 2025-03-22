import CodeMirrorEditor from './CodeMirrorEditor';

export * from './CodeMirrorEditor';
export * from './extensions';

export { CodeMirrorEditor };

/** 支持此编辑器的扩展名 */
export const supportExts = [
  'cpp',
  'cs',
  'css',
  'go',
  'html',
  'java',
  'js',
  'ts',
  'jsx',
  'tsx',
  'json',
  'less',
  'php',
  'python',
  'rs',
  'sass',
  'scss',
  'sql',
  'vue',
  'xml',
  'yaml',
  'yml',
  'md',
  'markdown',
  'txt',
  'gitignore',
  'ignore',
] as const;

export const isSupportLanguage = (fileName: string) => {
  const index = fileName.lastIndexOf('.');
  if (index < 0) return false;
  const extName = fileName.substring(index + 1).toLowerCase();
  return supportExts.findIndex((x) => x === extName) >= 0;
};
