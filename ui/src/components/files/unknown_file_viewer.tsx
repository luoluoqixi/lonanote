import { Ellipsis, ExternalLink } from "@tamagui/lucide-icons-2";
import { type Href, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, type MenuItemData, Text, useMenuTriggerState, useTheme } from "rn-ui-kit";

import { openExternalFile } from "@/api/commands/utils";
import { workspace } from "@/api/commands/workspace";
import { getFileMimeType, getFileName, resolveWorkspaceFileUrl } from "@/api/common";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

function UnknownFileMenuTrigger() {
  const { opacity } = useMenuTriggerState();

  return (
    <Button accessibilityLabel="未知文件操作" chromeless circular hitSlop={8} opacity={opacity}>
      <Ellipsis size={20} />
    </Button>
  );
}

function UnknownFileMenu({
  isOpening,
  onOpenInOtherApp,
}: {
  isOpening: boolean;
  onOpenInOtherApp: () => void;
}) {
  const theme = useTheme();
  const accentColor = theme.color10.val as ComponentProps<typeof ExternalLink>["color"];
  const items = useMemo<MenuItemData[]>(
    () => [
      {
        disabled: isOpening,
        icon: <ExternalLink color={accentColor} size={14} />,
        iconProps: {
          ios: { name: "arrow.up.forward.app" },
        },
        label: isOpening ? "正在打开…" : "在其他应用中打开",
        onPress: onOpenInOtherApp,
        value: "open-in-other-app",
      },
    ],
    [accentColor, isOpening, onOpenInOtherApp],
  );

  return <Menu trigger={UnknownFileMenuTrigger} items={items} nativeHaptics />;
}

export function UnknownFileViewer() {
  const workspaceId = useCurrentWorkspaceId();
  const { path } = useLocalSearchParams<{
    path?: string | string[];
  }>();
  const { toast } = useToast();
  const [isOpening, setIsOpening] = useState(false);
  const filePath = Array.isArray(path) ? path[0] : path;

  const openInOtherApp = useCallback(async () => {
    if (!workspaceId || !filePath || isOpening) {
      return;
    }

    setIsOpening(true);

    try {
      const workspaceSnapshot = await workspace.get(workspaceId);
      const fileUrl = resolveWorkspaceFileUrl(workspaceSnapshot, filePath);
      await openExternalFile(fileUrl, getFileMimeType(filePath));
    } catch (error) {
      console.error("[unknown-file] open in other app failed", error);
      toast.error(error instanceof Error ? error.message : "无法在其他应用中打开文件");
    } finally {
      setIsOpening(false);
    }
  }, [filePath, isOpening, toast, workspaceId]);

  if (!workspaceId || !filePath) {
    return <Redirect href={"/" as Href} />;
  }

  const title = getFileName(filePath);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <UnknownFileMenu isOpening={isOpening} onOpenInOtherApp={openInOtherApp} />
          ),
          title,
        }}
      />
      <View style={styles.container}>
        <Text color="$gray11" fontSize="$4">
          无法预览此文件
        </Text>
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
});
