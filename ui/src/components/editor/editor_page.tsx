import { ExternalLink } from "lucide-react-native";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dropdown, type DropdownItemData, useUiTheme } from "rn-ui-kit";

import { getFileName, isIos } from "@/api/common";
import { useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { EditorWebView } from "./editor_webview";

function HeaderMenuActionButton({ open }: { open: boolean }) {
  return (
    <Button
      accessibilityLabel="编辑器文件操作"
      accessibilityRole="button"
      circular
      hitSlop={8}
      native={isIos()}
      style={{ opacity: open ? 0.4 : 1 }}
      title="•••"
      variant="ghost"
    />
  );
}

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
      <Stack.Screen
        options={{
          headerRight: () => (
            <Dropdown trigger={HeaderMenuActionButton} items={menuItems} nativeHaptics />
          ),
          title: getFileName(filePath),
        }}
      />
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
