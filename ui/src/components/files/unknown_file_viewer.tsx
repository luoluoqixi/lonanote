import { type Href, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { type DropdownItemData, Text, useUiTheme } from "rn-ui-kit";

import { getFileName } from "@/api/common";
import { getMenuHeaderRightMenuProps } from "@/components/common/header_actions";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { OpenInOtherAppButton, useOpenInOtherApp } from "./open_in_other_app";

export function UnknownFileViewer() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{
    path?: string | string[];
  }>();
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

  if (!workspaceId || !filePath) {
    return <Redirect href={"/" as Href} />;
  }

  const title = getFileName(filePath);

  return (
    <>
      <Stack.Screen
        options={{
          ...getMenuHeaderRightMenuProps({ menuItems, labelColor: theme.primary }),
          title,
        }}
      />
      <View style={styles.container}>
        <Text className="text-muted-foreground text-base">无法预览此文件</Text>
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
