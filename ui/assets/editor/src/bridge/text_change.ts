export type TextChange = { from: number; to: number; insert: string };
export function textChange(before: string, after: string): TextChange {
  let from = 0;
  while (from < before.length && from < after.length && before[from] === after[from]) from++;
  let end = 0;
  while (
    end < before.length - from &&
    end < after.length - from &&
    before[before.length - end - 1] === after[after.length - end - 1]
  )
    end++;
  return { from, to: before.length - end, insert: after.slice(from, after.length - end) };
}
export function applyTextChange(text: string, c: TextChange): string {
  if (
    !Number.isSafeInteger(c.from) ||
    !Number.isSafeInteger(c.to) ||
    c.from < 0 ||
    c.to < c.from ||
    c.to > text.length
  )
    throw new Error("无效文本变化");
  return text.slice(0, c.from) + c.insert + text.slice(c.to);
}
export function mapTextPosition(position: number, c: TextChange): number {
  return position < c.from
    ? position
    : position > c.to
      ? position + c.insert.length - (c.to - c.from)
      : c.from + c.insert.length;
}

/** 内存文档统一使用CodeMirror的LF坐标；文件指纹仍保留磁盘原始元数据。 */
export function normalizeEditorText(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}
