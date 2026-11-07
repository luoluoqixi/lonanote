export const EDITOR_FILE_EXTENSIONS = ["md", "markdown", "mdx", "txt"];

export function isEditorFileDropInside(
  position: { x: number; y: number },
  bounds: { left: number; top: number; right: number; bottom: number },
  pixelRatio: number,
) {
  const x = position.x / pixelRatio;
  const y = position.y / pixelRatio;
  return x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom;
}

export function getEditorDroppedFiles(
  paths: readonly string[],
  position: { x: number; y: number },
  bounds: { left: number; top: number; right: number; bottom: number },
  pixelRatio: number,
): string[] {
  // Tauri 拖放位置使用物理像素，DOM 边界使用 CSS 像素。
  if (!isEditorFileDropInside(position, bounds, pixelRatio)) return [];
  return paths.filter((path) => {
    const extension = path.split(/[\\/]/).pop()?.split(".").pop()?.toLowerCase();
    return !!extension && EDITOR_FILE_EXTENSIONS.includes(extension);
  });
}
