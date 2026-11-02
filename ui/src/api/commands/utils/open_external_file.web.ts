import { invoke } from "@tauri-apps/api/core";

import { isTauri } from "@/api/common/platform";

export async function openExternalFile(fileUrl: string, mimeType: string): Promise<void> {
  void mimeType;
  if (isTauri()) {
    await invoke("plugin:shell|open", { path: fileUrl, with: null });
    return;
  }
  throw new Error("在其他应用中打开文件暂不支持桌面端");
}
