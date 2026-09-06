function normalizeMarkdownAnchor(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, "")
    .replace(/\s+/g, "-");
}

function getMarkdownHeadingAnchor(line: string): string | null {
  const match = /^(?: {0,3})(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/.exec(line);
  if (!match) return null;
  return normalizeMarkdownAnchor(match[2]);
}

/** 返回 GitHub 风格 Markdown fragment 所在 heading 的 1-based 行号。 */
export function findMarkdownAnchorLine(document: string, fragment: string): number | null {
  let decodedFragment = fragment;
  try {
    decodedFragment = decodeURIComponent(fragment);
  } catch {
    return null;
  }
  const target = normalizeMarkdownAnchor(decodedFragment);
  if (!target) return null;

  const seenAnchors = new Map<string, number>();
  const lines = document.split("\n");
  for (const [index, line] of lines.entries()) {
    const baseAnchor = getMarkdownHeadingAnchor(line);
    if (!baseAnchor) continue;
    const occurrence = seenAnchors.get(baseAnchor) ?? 0;
    seenAnchors.set(baseAnchor, occurrence + 1);
    const anchor = occurrence === 0 ? baseAnchor : `${baseAnchor}-${occurrence}`;
    if (anchor === target) return index + 1;
  }
  return null;
}
