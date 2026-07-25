import { invoke } from "@tauri-apps/api/core";

import { isTauri } from "@/api/common/platform";

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri()) {
    await invoke("plugin:shell|open", {
      path: url,
      with: null,
    });
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
