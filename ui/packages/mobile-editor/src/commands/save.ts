import { getContent, saveContent } from '@/editor';

export const save = async () => {
  const content = getContent();
  if (content != null) {
    window.fileContent = content;
    saveContent(window.fileContent);
  }
};
