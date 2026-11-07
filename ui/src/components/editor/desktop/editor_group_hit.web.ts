/** iframe 和稳定 surface 层都通过宿主标记定位目标编辑组。 */
export function getEditorGroupAtPoint(x: number, y: number): string | null {
  const target = document.elementFromPoint(x, y);
  const surface = target?.closest("[id^=desktop-editor-surface-]");
  if (surface)
    return decodeURIComponent(surface.id.slice("desktop-editor-surface-".length).split(":")[0]);
  const group = target?.closest("[id^=desktop-editor-group-]");
  return group?.id.slice("desktop-editor-group-".length) ?? null;
}
