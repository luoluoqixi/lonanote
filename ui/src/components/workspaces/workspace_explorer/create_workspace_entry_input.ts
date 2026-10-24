export function getCreateEntrySelectionEnd(name: string, isNote: boolean) {
  if (!isNote) {
    return name.length;
  }
  const extensionStart = name.lastIndexOf(".");
  return extensionStart > 0 ? extensionStart : name.length;
}
