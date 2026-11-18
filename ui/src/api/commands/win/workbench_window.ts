import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";

/** 由 Rust 按调用方会话解析，不能把全局设置固定绑定到 main。 */
export async function getWorkbenchWindow() {
  const label = await invoke<string>("get_dialog_workbench_label");
  const window = await Window.getByLabel(label);
  if (!window) throw new Error("所属工作台窗口已关闭");
  return window;
}
