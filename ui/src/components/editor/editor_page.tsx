import { Redirect, useLocalSearchParams } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { type DropdownItemData, useUiTheme } from "rn-ui-kit";

import { getFileName } from "@/api/common";
import { useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { EditorHeader } from "./editor_header";
import { EditorWebView } from "./editor_webview";

export function EditorPage() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{ path?: string | string[] }>();
  const filePath = Array.isArray(path) ? path[0] : path;
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof ExternalLink>["color"];
  const menuItems = useMemo<DropdownItemData[]>(
    () => [
      {
        disabled: isOpening,
        icon: <ExternalLink color={accentColor} size={14} />,
        iconProps: { ios: { name: "arrow.up.forward.app" } },
        label: isOpening ? "正在打开…" : "在其他应用中打开",
        onPress: openInOtherApp,
        value: "open-in-other-app",
      },
    ],
    [accentColor, isOpening, openInOtherApp],
  );

  if (!filePath) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <EditorHeader menuItems={menuItems} title={getFileName(filePath)} />
      <View style={styles.container}>
        <EditorWebView />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
