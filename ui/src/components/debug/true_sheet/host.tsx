import { Platform } from "react-native";

import { isDesktop, isWeb } from "@/api/common";

import { DebugTrueSheetAndroidHost } from "./android_host";
import { DebugTrueSheetIosStackHost } from "./ios_stack_host";

/**
 * 小屏调试 True Sheet 宿主。
 * - iOS：Native Stack 原生标题栏
 * - Android：自绘标题栏（Sheet 内无法使用 react-native-screens）
 */
export function DebugTrueSheetHost() {
  if (isWeb() || isDesktop()) {
    return null;
  }

  if (Platform.OS === "android") {
    return <DebugTrueSheetAndroidHost />;
  }

  return <DebugTrueSheetIosStackHost />;
}
