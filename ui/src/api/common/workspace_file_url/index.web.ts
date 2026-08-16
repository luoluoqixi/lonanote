import type { WorkspaceSnapshot } from "@/api/commands/workspace";

/** Tauri 的 Workspace file asset protocol 尚未接入，不能把相对路径直接传给 WebView。 */
export function resolveWorkspaceFileUrl(_workspace: WorkspaceSnapshot, _path: string): string {
  void _workspace;
  void _path;

  throw new Error("文件预览暂不支持桌面端");
}
