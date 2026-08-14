import { CommonActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { useCallback } from "react";

type WorkspaceStackRootRoute = "index" | "workspace/index";

export function useWorkspaceNavigation() {
  const navigation = useNavigation("/(main)");

  const resetToRootRoute = useCallback(
    (routeName: WorkspaceStackRootRoute) => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: routeName }],
        }),
      );
    },
    [navigation],
  );

  return {
    resetToWorkspace: useCallback(() => {
      resetToRootRoute("workspace/index");
    }, [resetToRootRoute]),
    resetToWorkspaceSelect: useCallback(() => {
      resetToRootRoute("index");
    }, [resetToRootRoute]),
  };
}
