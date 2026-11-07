export function reloadAppWindow(
  isNative: boolean,
  reloadWeb: () => void,
  reloadNative: () => void,
): void {
  if (isNative) reloadNative();
  else reloadWeb();
}

/** 把实际 reload 留在草稿屏障内，准备失败时保持当前 renderer。 */
export async function reloadAppWindowWithPreparation(
  isNative: boolean,
  reloadWeb: () => void,
  reloadNative: () => void,
  prepare: (reload: () => void) => Promise<void>,
): Promise<void> {
  await prepare(() => reloadAppWindow(isNative, reloadWeb, reloadNative));
}
