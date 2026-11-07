/** ready 及恢复记录确认之前，调用方必须保留源视图的文档引用。 */
export async function completeEditorWindowTransfer(
  mode: "move" | "copy",
  target: { ready: Promise<void>; checkpoint: () => Promise<void>; removeSource: () => void },
): Promise<void> {
  await target.ready;
  await target.checkpoint();
  if (mode === "move") target.removeSource();
}
