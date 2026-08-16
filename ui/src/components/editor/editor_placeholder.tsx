import { ExternalLink } from "@tamagui/lucide-icons-2";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, type MenuItemData, useMenuTriggerState, useTheme } from "rn-ui-kit";

import { getFileName, isIos } from "@/api/common";
import { useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

function HeaderMenuActionButton() {
  const { isActive } = useMenuTriggerState();

  return (
    <Button
      accessibilityLabel="编辑器文件操作"
      accessibilityRole="button"
      chromeless
      circular
      hitSlop={8}
      native={isIos()}
      opacity={isActive ? 0.4 : 1}
      title="•••"
    />
  );
}

export function EditorPlaceholder() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{ path?: string | string[] }>();
  const filePath = Array.isArray(path) ? path[0] : path;
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });
  const theme = useTheme();
  const accentColor = theme.color10.val as ComponentProps<typeof ExternalLink>["color"];
  const menuItems = useMemo<MenuItemData[]>(
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
            <Menu trigger={HeaderMenuActionButton} items={menuItems} nativeHaptics />
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
