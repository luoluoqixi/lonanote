import { requireOptionalNativeModule } from "expo-modules-core";

import { type NativeFontsApi, systemFontAdapter } from "./system_adapter";

function module(): NativeFontsApi {
  const native = requireOptionalNativeModule<NativeFontsApi>("NativeSystemFonts");
  if (!native) throw new Error("系统字体模块尚未安装，请重新构建应用");
  return native;
}

export const systemFonts = systemFontAdapter({
  list: (refresh = false) => module().list(refresh),
  resolve: (selection, consumer) => module().resolve(selection, consumer),
});
