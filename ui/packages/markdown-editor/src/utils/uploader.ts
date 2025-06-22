import type { Node as ProseNode, Schema } from '@milkdown/prose/model';

export const defaultUploader = async (
  files: FileList,
  schema: Schema,
  onUpload: (file: File) => Promise<string>,
) => {
  const imgs: File[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files.item(i);
    if (!file) continue;
    if (!file.type.includes('image')) continue;
    imgs.push(file);
  }
  const imageBlock = schema.nodes['image-block'];
  if (!imageBlock)
    throw new Error('Missing node in schema, milkdown cannot find "image-block" in schema.');
  const data = await Promise.all(
    imgs.map(async (img) => {
      const src = await onUpload(img);
      return {
        src,
        caption: img.name,
        ratio: 1,
      };
    }),
  );
  return data.map(
    ({ caption, src, ratio }) => imageBlock.createAndFill({ src, caption, ratio }) as ProseNode,
  );
};
