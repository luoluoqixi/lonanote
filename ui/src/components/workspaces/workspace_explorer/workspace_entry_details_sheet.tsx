import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Dialog,
  NativeList,
  NativeListSection,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import type { WorkspaceIndexEntry } from "@/api/commands/workspace";
import { formatUnixSecondsFullDateTime, getFileName } from "@/api/common";
import { useLayoutMode } from "@/hooks/layout";

import { WorkspaceDetailsListItem } from "../workspace_details_list_item";

type WorkspaceEntryDetailsSheetProps = {
  entry: WorkspaceIndexEntry | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  rootName?: string;
};

function formatDate(value: number | null | undefined): string {
  return formatUnixSecondsFullDateTime(value) ?? "未知";
}

export function WorkspaceEntryDetailsSheet({
  entry,
  onOpenChange,
  open,
  rootName,
}: WorkspaceEntryDetailsSheetProps) {
  const { layoutMode } = useLayoutMode();
  const { width, height } = useWindowDimensions();
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });

  if (!entry) {
    return null;
  }

  const isDirectory = entry.fileType === "directory";

  const content = (
    <NativeList style={styles.list} tracksNavigationBarScrollEdge>
      <NativeListSection title="基本信息">
        <WorkspaceDetailsListItem
          copyId="entry-name"
          title="名称"
          value={entry.path === "" ? (rootName ?? "根目录") : getFileName(entry.path)}
        />
        <WorkspaceDetailsListItem
          copyId="entry-type"
          title="类型"
          value={isDirectory ? "文件夹" : "文件"}
        />
        <WorkspaceDetailsListItem
          copyId="entry-path"
          title="路径"
          value={entry.path || "."}
          valueFontSize={14}
        />
      </NativeListSection>
      <NativeListSection title="时间">
        <WorkspaceDetailsListItem
          copyId="entry-created-at"
          title="创建时间"
          value={formatDate(entry.createTime)}
        />
        <WorkspaceDetailsListItem
          copyId="entry-last-modified-at"
          title="编辑时间"
          value={formatDate(entry.lastModifiedTime)}
        />
      </NativeListSection>
    </NativeList>
  );

  if (layoutMode === "desktop") {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={isDirectory ? "文件夹详情" : "文件详情"}
        content={content}
        contentProps={{
          style: {
            width: Math.min(600, width * 0.9),
            maxWidth: width * 0.9,
            height: Math.min(480, height * 0.8),
            padding: 16,
            backgroundColor: appBackgroundColors.sheet,
          },
        }}
      />
    );
  }

  return (
    <NativeSheetStack
      initialRouteName="entry-details"
      name="workspace-entry-details-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: ["58%"],
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen
        name="entry-details"
        options={{ title: isDirectory ? "文件夹详情" : "文件详情" }}
      >
        {() => content}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
  },
});
