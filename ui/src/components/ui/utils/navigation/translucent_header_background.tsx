import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";

import { isIos26Plus, os } from "@/api/common/platform";
import { VariableBlurView } from "@/components/ui/utils/navigation/variable_blur_view";

type TransparentHeaderFallbackOptions = Pick<
  NativeStackNavigationOptions,
  "headerBackground" | "headerBlurEffect"
>;

const IOS_FALLBACK_BLUR_RADIUS = 32;
const IOS_FALLBACK_TRANSITION_HEIGHT = 104;

function LegacyIosHeaderBackground() {
  return (
    <VariableBlurView
      blurRadius={IOS_FALLBACK_BLUR_RADIUS}
      direction="topToBottom"
      pointerEvents="none"
      style={styles.container}
      transitionHeight={IOS_FALLBACK_TRANSITION_HEIGHT}
    />
  );
}

/**
 * iOS 26 以下无法拿到系统级 Liquid Glass 滚动边缘材质，
 * 这里改用自定义原生 variable blur，尽量贴近系统 header 的渐变雾化过渡。
 */
export function getIosTransparentHeaderFallbackOptions(): TransparentHeaderFallbackOptions {
  if (os() !== "ios" || isIos26Plus()) {
    return {};
  }

  return {
    headerBlurEffect: "none",
    headerBackground: () => <LegacyIosHeaderBackground />,
  };
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
