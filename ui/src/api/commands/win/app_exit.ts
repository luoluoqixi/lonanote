import { isDesktop } from "@/api/common/platform";

/** 调用前必须完成全部文档的关闭确认。 */
export async function exitDesktopApp(): Promise<void> {
  if (!isDesktop()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("exit_app");
}
