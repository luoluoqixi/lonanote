import { StackActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { useCallback } from "react";

type WorkspaceStackRootRoute = "index" | "workspace/index";

export function useWorkspaceNavigation() {
  const navigation = useNavigation("/(main)");

  const replaceRootRoute = useCallback(
    (routeName: WorkspaceStackRootRoute) => {
      // workspace 根页面只需要替换当前 screen。CommonActions.reset 在 native-stack
      // 中会临时保留旧页面再执行 pop，导致两个页面的原生 header 同时参与转场。
      navigation.dispatch(StackActions.replace(routeName));
    },
    [navigation],
  );

  return {
    resetToWorkspace: useCallback(() => {
      replaceRootRoute("workspace/index");
    }, [replaceRootRoute]),
    resetToWorkspaceSelect: useCallback(() => {
      replaceRootRoute("index");
    }, [replaceRootRoute]),
  };
}
