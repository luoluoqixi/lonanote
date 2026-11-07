import { invoke } from "@tauri-apps/api/core";

import { fontSelectionIdentity } from "@/fonts/font_selection";

import type { SystemFontsApi } from "./types";

export const systemFonts: SystemFontsApi = {
  list: (refresh = false) => invoke("list_system_fonts", { refresh }),
  resolve: (selection, consumer) =>
    invoke("resolve_system_font", { selection: fontSelectionIdentity(selection), consumer }),
};
