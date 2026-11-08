import { invoke } from "@tauri-apps/api/core";

import { systemFontAdapter } from "./system_adapter";

export const systemFonts = systemFontAdapter({
  list: (refresh = false) => invoke("list_system_fonts", { refresh }),
  resolve: (selection, consumer) => invoke("resolve_system_font", { selection, consumer }),
});
