import { type } from "@tauri-apps/plugin-os";

import type { OSType } from "./types";

export function os(): OSType {
  return type();
}
