import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler, ToastAndroid } from "react-native";

import { isAndroid } from "@/api/common";

const DOUBLE_BACK_INTERVAL_MS = 2_000;

/** Android 主路由栈位于根页面时，第一次返回提示、第二次退出应用。 */
export function useAndroidDoubleBackToExit() {
  const navigation = useNavigation("/(main)");
  const lastBackPressedAtRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (!isAndroid()) {
        return;
      }

      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        if (navigation.canGoBack()) {
          lastBackPressedAtRef.current = 0;
          return false;
        }

        const pressedAt = Date.now();
        if (pressedAt - lastBackPressedAtRef.current <= DOUBLE_BACK_INTERVAL_MS) {
          lastBackPressedAtRef.current = 0;
          BackHandler.exitApp();
          return true;
        }

        lastBackPressedAtRef.current = pressedAt;
        ToastAndroid.show("再按一次退出应用", ToastAndroid.SHORT);
        return true;
      });

      return () => {
        subscription.remove();
        lastBackPressedAtRef.current = 0;
      };
    }, [navigation]),
  );
}
