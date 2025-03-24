const defaultNotShowLineNumList = ['md', 'markdown'] as const;

export const defaultShowLineNum = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return defaultNotShowLineNumList.findIndex((x) => x === ext) < 0;
};
