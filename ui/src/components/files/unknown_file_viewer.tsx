import { ExternalLink } from "@tamagui/lucide-icons-2";
import { type Href, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, type MenuItemData, Text, useMenuTriggerState, useTheme } from "rn-ui-kit";

import { getFileName, isIos } from "@/api/common";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { OpenInOtherAppButton, useOpenInOtherApp } from "./open_in_other_app";

function HeaderMenuActionButton() {
  const { isActive } = useMenuTriggerState();

  return (
    <Button
      accessibilityLabel="未知文件操作"
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

export function UnknownFileViewer() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{
    path?: string | string[];
  }>();
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

  if (!workspaceId || !filePath) {
    return <Redirect href={"/" as Href} />;
  }

  const title = getFileName(filePath);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Menu trigger={HeaderMenuActionButton} items={menuItems} nativeHaptics />
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
