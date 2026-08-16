import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { getFileName } from "@/api/common";
import { OpenInOtherAppMenu, useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

export function EditorPlaceholder() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{ path?: string | string[] }>();
  const filePath = Array.isArray(path) ? path[0] : path;
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });

  if (!filePath) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <OpenInOtherAppMenu
              accessibilityLabel="编辑器文件操作"
              isOpening={isOpening}
              onOpenInOtherApp={openInOtherApp}
            />
          ),
          title: getFileName(filePath),
        }}
      />
      <View style={styles.container} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
