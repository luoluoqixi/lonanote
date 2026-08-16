import { StyleSheet } from "react-native";
import {
  NativeList,
  NativeListItem,
  NativeListSection,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";
import { formatUnixSecondsFullDateTime } from "@/api/common";

const WORKSPACE_DETAILS_SNAP_POINTS = [72];

type WorkspaceDetailsSheetProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  workspaceItem: WorkspaceListItem | null;
};

function formatValue(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "未知";
}

function formatDate(value: number | null | undefined): string {
  return formatUnixSecondsFullDateTime(value) ?? "未知";
}

export function WorkspaceDetailsSheet({
  onOpenChange,
  open,
  workspaceItem,
}: WorkspaceDetailsSheetProps) {
  const appBackgroundColors = useAppBackgroundColors();
  const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
    headerBackgroundColor: appBackgroundColors.header,
    screenBackgroundColor: appBackgroundColors.sheet,
  });
  const storage = workspaceItem?.storage;
  const storageKind = storage?.kind ?? workspaceItem?.storageKind;
  const storageKindLabel = storageKind === "managed" ? "应用内存储" : "外部存储";
  const localDirectoryPath =
    storage?.directoryName ?? (storageKind === "external" ? "外部存储不提供本地路径" : "未知");

  if (!workspaceItem) {
    return null;
  }

  return (
    <NativeSheetStack
      initialRouteName="workspace-details"
      name="workspace-details-sheet"
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={{
        snapPoints: WORKSPACE_DETAILS_SNAP_POINTS,
        snapPointsMode: "percent",
      }}
      screenOptions={nativeHeaderOptions}
    >
      <NativeSheetStack.Screen name="workspace-details" options={{ title: "工作区详情" }}>
        {() => (
          <NativeList style={styles.list} tracksNavigationBarScrollEdge>
            <NativeListSection title="基本信息">
              <NativeListItem title="工作区名称" value={workspaceItem.displayName} />
              <NativeListItem title="存储位置" value={storageKindLabel} />
              <NativeListItem title="存储 Provider" value={formatValue(storage?.providerId)} />
              <NativeListItem
                title="本地文件夹路径"
                value={localDirectoryPath}
                valueFontSize={14}
              />
              <NativeListItem title="Workspace ID" value={workspaceItem.id} valueFontSize={14} />
            </NativeListSection>
            <NativeListSection title="时间">
              <NativeListItem title="创建时间" value={formatDate(workspaceItem.createdAt)} />
              <NativeListItem title="上次打开时间" value={formatDate(workspaceItem.lastOpenedAt)} />
            </NativeListSection>
          </NativeList>
        )}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
});
