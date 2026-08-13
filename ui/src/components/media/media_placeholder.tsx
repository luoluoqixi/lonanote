import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";

import { getFileName } from "@/api/common";

export type WorkspaceMediaKind = "image" | "video";

export function MediaPlaceholder() {
  const { kind, path } = useLocalSearchParams<{
    kind?: string | string[];
    path?: string | string[];
  }>();
  const mediaKind = Array.isArray(kind) ? kind[0] : kind;
  const filePath = Array.isArray(path) ? path[0] : path;

  if (!filePath || (mediaKind !== "image" && mediaKind !== "video")) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: getFileName(filePath) }} />
      <View style={styles.container} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
