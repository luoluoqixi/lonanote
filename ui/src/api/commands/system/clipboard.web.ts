import { invoke as invokeTauri } from "@tauri-apps/api/core";

import { isTauri } from "@/api/common/platform";

async function readText(): Promise<string> {
  if (isTauri()) {
    return invokeTauri<string>("read_clipboard_text");
  }
  return navigator.clipboard.readText();
}

async function writeText(text: string): Promise<void> {
  if (isTauri()) {
    await invokeTauri("write_clipboard_text", { text });
    return;
  }
  await navigator.clipboard.writeText(text);
}

/** 桌面 Tauri 与普通 Web 的文字剪切板能力。 */
export const clipboard = {
  readText,
  writeText,
  clear: (): Promise<void> => writeText(""),
};
