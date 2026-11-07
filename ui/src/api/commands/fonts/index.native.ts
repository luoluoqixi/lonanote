import { requireOptionalNativeModule } from "expo-modules-core";

import { fontSelectionIdentity } from "@/fonts/font_selection";

import type { SystemFontsApi } from "./types";

function module(): SystemFontsApi {
  const native = requireOptionalNativeModule<SystemFontsApi>("NativeSystemFonts");
  if (!native) throw new Error("系统字体模块尚未安装，请重新构建应用");
  return native;
}

export const systemFonts: SystemFontsApi = {
  list: (refresh = false) => module().list(refresh),
  resolve: (selection, consumer) => module().resolve(fontSelectionIdentity(selection), consumer),
};
