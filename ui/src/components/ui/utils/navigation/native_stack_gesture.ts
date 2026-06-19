import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { isIos26Plus, os } from "@/api/common/platform";

/**
 * iOS 原生导航统一开启全屏返回手势。
 * iOS18 如果开启全屏返回, 那么系统的返回动画会被替换. 后面需要考虑是否开启, 或只在某些页面开启
 */
export const IOS_NATIVE_STACK_FULL_SCREEN_BACK_GESTURE_ENABLED = isIos26Plus();

export function withNativeStackGestureOptions<T extends NativeStackNavigationOptions>(
  screenOptions: T,
): T {
  if (os() !== "ios" || !IOS_NATIVE_STACK_FULL_SCREEN_BACK_GESTURE_ENABLED) {
    return screenOptions;
  }

  return {
    ...screenOptions,
    fullScreenGestureEnabled: true,
    fullScreenGestureShadowEnabled: true,
    gestureEnabled: true,
  };
}
