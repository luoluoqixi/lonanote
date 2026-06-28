import { ArrowLeft } from "@tamagui/lucide-icons-2";
import { createElement } from "react";
import { Platform } from "react-native";

import { os } from "@/api/common/platform";
import { getIosTransparentHeaderFallbackOptions } from "@/components/ui/utils/navigation";
import { nativeStackStatusBarOptions } from "@/components/ui/utils/navigation/status_bar";
import type { ResolvedColorScheme } from "@/components/ui/utils/navigation/status_bar";

import type { NativeSheetStackScreenOptions } from "./types";

/** NativeSheetStack 的统一 screenOptions：iOS 走 Native Stack，其它平台走 JS Stack。 */
export function nativeSheetStackScreenOptions(
  colorScheme: ResolvedColorScheme,
  backgroundColor: string | undefined,
  tintColor: string,
  titleColor: string,
): NativeSheetStackScreenOptions {
  if (Platform.OS === "ios") {
    return {
      ...nativeStackStatusBarOptions(colorScheme),
      contentStyle: {
        backgroundColor,
        flex: 1,
      },
      headerShadowVisible: false,
      headerTransparent: true,
      headerStyle: {
        backgroundColor: "transparent",
      },
      headerTintColor: tintColor,
      headerTitleStyle: {
        color: titleColor,
      },
      ...getIosTransparentHeaderFallbackOptions(),
    };
  }

  return {
    cardStyle: {
      backgroundColor,
    },
    headerBackImage: ({ tintColor: backTintColor }) =>
      createElement(ArrowLeft as never, { color: backTintColor, size: 24 }),
    headerBackTitle: os() === "ios" ? "返回" : undefined,
    headerStatusBarHeight: 0,
    headerStyle: {
      backgroundColor,
    },
    headerTintColor: tintColor,
    headerTitleStyle: {
      color: titleColor,
    },
  };
}
