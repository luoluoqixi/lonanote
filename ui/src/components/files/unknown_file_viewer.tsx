import { type Href, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "rn-ui-kit";

import { getFileName } from "@/api/common";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { OpenInOtherAppButton, OpenInOtherAppMenu, useOpenInOtherApp } from "./open_in_other_app";

export function UnknownFileViewer() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{
    path?: string | string[];
  }>();
  const filePath = Array.isArray(path) ? path[0] : path;
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });

  if (!workspaceId || !filePath) {
    return <Redirect href={"/" as Href} />;
  }

  const title = getFileName(filePath);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <OpenInOtherAppMenu
              accessibilityLabel="未知文件操作"
              isOpening={isOpening}
              onOpenInOtherApp={openInOtherApp}
            />
          ),
          title,
        }}
      />
      <View style={styles.container}>
        <Text color="$gray11" fontSize="$4">
          无法预览此文件
        </Text>
        <View style={styles.openButton}>
          <OpenInOtherAppButton isOpening={isOpening} onOpenInOtherApp={openInOtherApp} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  openButton: {
    marginTop: 16,
  },
});
