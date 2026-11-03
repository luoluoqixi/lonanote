/** 重复点击的导航语义由 UI 模式决定，与运行平台无关。 */
export function resolveWorkspacePressAction(
  layoutMode: "desktop" | "mobile",
  currentWorkspaceId: string | null,
  targetWorkspaceId: string,
): "notifyAlreadyOpen" | "returnToWorkspace" | "openWorkspace" {
  if (currentWorkspaceId !== targetWorkspaceId) return "openWorkspace";
  return layoutMode === "desktop" ? "notifyAlreadyOpen" : "returnToWorkspace";
}
