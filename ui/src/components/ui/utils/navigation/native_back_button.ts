import type {
  NativeStackHeaderItemProps,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";

import { isIos26Plus, os } from "@/api/common/platform";

type NativeBackButtonOptions = {
  label: string;
  onPress: () => void;
};

/**
 * iOS 26 的透明导航栏默认返回按钮在部分场景下不会正确应用 `headerTintColor`。
 * 这里统一降级为原生 header item，并把系统版本判断收口在一个入口里。
 */
export function withNativeBackButton<T extends NativeStackNavigationOptions>(
  screenOptions: T,
  options: NativeBackButtonOptions,
): T {
  if (
    os() !== "ios" ||
    !isIos26Plus() ||
    screenOptions.unstable_headerLeftItems != null ||
    screenOptions.headerLeft != null
  ) {
    return screenOptions;
  }

  return {
    ...screenOptions,
    headerBackVisible: false,
    unstable_headerLeftItems: ({ canGoBack, tintColor }: NativeStackHeaderItemProps) => {
      if (!canGoBack) {
        return [];
      }

      return [
        {
          type: "button" as const,
          label: options.label,
          icon: { type: "sfSymbol" as const, name: "chevron.left" as const },
          onPress: options.onPress,
          tintColor,
        },
      ];
    },
  };
}
