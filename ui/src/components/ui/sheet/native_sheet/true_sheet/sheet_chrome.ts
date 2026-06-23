/** True Sheet 顶栏形态：`plain` 仅 grabber；`toolbar` 自绘工具栏（对齐 Expo Stack 左返回 + 标题）。 */
export type TrueSheetChromeMode = "plain" | "toolbar";

/** 未显式传 `grabber` 时：`plain` 显示，`toolbar` 隐藏。 */
export function resolveTrueSheetGrabber(chrome: TrueSheetChromeMode, explicit?: boolean): boolean {
  if (explicit !== undefined) {
    return explicit;
  }

  return chrome === "plain";
}
