import { os } from "@/api/common/platform";
import { nativeStackStatusBarOptions } from "@/components/ui/utils/navigation/status_bar";
import type { ResolvedColorScheme } from "@/components/ui/utils/navigation/status_bar";

import type { TrueSheetInnerStackScreenOptions } from "./stack_navigator";
import { trueSheetUsesNativeStackNavigator } from "./stack_navigator";

/** True Sheet 内嵌栈的 screenOptions（仅 iOS Native Stack 使用）。 */
export function trueSheetInnerStackScreenOptions(
  colorScheme: ResolvedColorScheme,
  backgroundColor: string,
  titleColor: string,
): TrueSheetInnerStackScreenOptions {
  if (trueSheetUsesNativeStackNavigator) {
    return {
      ...nativeStackStatusBarOptions(colorScheme),
      contentStyle: {
        backgroundColor,
      },
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor,
      },
      headerTitleStyle: {
        color: titleColor,
      },
      // 不设 headerTintColor，返回/关闭按钮沿用 iOS 系统蓝色
    };
  }

  return {
    cardStyle: {
      backgroundColor,
    },
    headerBackTitle: os() === "ios" ? "返回" : undefined,
    headerStyle: {
      backgroundColor,
    },
    headerTitleStyle: {
      color: titleColor,
    },
  };
}
