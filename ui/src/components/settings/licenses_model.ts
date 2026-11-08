/** 长文本虚拟化显示；不在分页处增删字符，也不拆开 UTF-16 代理对。 */
export function licenseTextBlocks(text: string): { id: string; text: string }[] {
  const blocks: { id: string; text: string }[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(offset + 8192, text.length);
    if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    blocks.push({ id: String(offset), text: text.slice(offset, end) });
    offset = end;
  }
  return blocks;
}
