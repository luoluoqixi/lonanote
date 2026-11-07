import { type Href, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { type ComponentProps, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type DropdownItemData, Text, useUiTheme } from "rn-ui-kit";

import { getFileName } from "@/api/common";
import { getMenuHeaderRightMenuProps } from "@/components/common/header_actions";
import { editorWindowRuntime } from "@/components/editor/controllers/editor_window_runtime";
import { openViewerExternally } from "@/components/editor/controllers/editor_window_viewers";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { OpenInOtherAppButton, useOpenInOtherApp } from "./open_in_other_app";

export function UnknownFileViewer() {
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { path, workspaceId: rawWorkspaceId } = useLocalSearchParams<{
    path?: string | string[];
    workspaceId?: string | string[];
  }>();
  const filePath = Array.isArray(path) ? path[0] : path;
  const workspaceId = Array.isArray(rawWorkspaceId)
    ? rawWorkspaceId[0]
    : (rawWorkspaceId ?? currentWorkspaceId);
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
      <UnknownFileContent filePath={filePath} workspaceId={workspaceId} />
    </>
  );
}

export function UnknownFileContent(props: {
  filePath: string;
  workspaceId: string;
  viewerId?: string;
}) {
  if (editorWindowRuntime.isRemote()) return <RemoteUnknownFileContent viewerId={props.viewerId} />;
  return <LocalUnknownFileContent {...props} />;
}

function RemoteUnknownFileContent({ viewerId }: { viewerId?: string }) {
  const [isOpening, setIsOpening] = useState(false);
  const { toast } = useToast();
  const open = async () => {
    if (!viewerId || isOpening) return;
    setIsOpening(true);
    try {
      await openViewerExternally(viewerId);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsOpening(false);
    }
  };
  return (
    <View style={styles.container}>
      <Text>无法预览此文件</Text>
      <View style={styles.openButton}>
        <OpenInOtherAppButton
          isOpening={isOpening || !viewerId}
          onOpenInOtherApp={() => void open()}
        />
      </View>
    </View>
  );
}

function LocalUnknownFileContent({
  filePath,
  workspaceId,
}: {
  filePath: string;
  workspaceId: string;
}) {
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });
  return (
    <View style={styles.container}>
      <Text className="text-muted-foreground text-base">无法预览此文件</Text>
      <View style={styles.openButton}>
        <OpenInOtherAppButton isOpening={isOpening} onOpenInOtherApp={openInOtherApp} />
      </View>
    </View>
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
