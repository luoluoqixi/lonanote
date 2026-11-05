export function reloadAppWindow(
  isNative: boolean,
  reloadWeb: () => void,
  reloadNative: () => void,
): void {
  if (isNative) reloadNative();
  else reloadWeb();
}
