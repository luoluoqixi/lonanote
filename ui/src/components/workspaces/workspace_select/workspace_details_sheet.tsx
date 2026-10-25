import { StyleSheet } from "react-native";
import { NativeList, NativeListSection } from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";
import { formatUnixSecondsFullDateTime } from "@/api/common";
import { AdaptiveModal } from "@/components/common/adaptive_modal";

import { WorkspaceDetailsListItem } from "../workspace_details_list_item";

const WORKSPACE_DETAILS_SNAP_POINTS = ["72%" as const];

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
  const storage = workspaceItem?.storage;
  const storageKind = storage?.kind ?? workspaceItem?.storageKind;
  const storageKindLabel = storageKind === "managed" ? "应用内存储" : "外部存储";
  const localDirectoryPath =
    storage?.directoryName ?? (storageKind === "external" ? "外部存储不提供本地路径" : "未知");

  if (!workspaceItem) {
    return null;
  }

  const content = (
    <NativeList style={styles.list} tracksNavigationBarScrollEdge>
      <NativeListSection title="基本信息">
        <WorkspaceDetailsListItem
          copyId="workspace-display-name"
          title="工作区名称"
          value={workspaceItem.displayName}
        />
        <WorkspaceDetailsListItem
          copyId="workspace-storage-kind"
          title="存储位置"
          value={storageKindLabel}
        />
        <WorkspaceDetailsListItem
          copyId="workspace-storage-provider"
          title="存储 Provider"
          value={formatValue(storage?.providerId)}
        />
        <WorkspaceDetailsListItem
          copyId="workspace-local-directory-path"
          title="本地文件夹路径"
          value={localDirectoryPath}
          valueFontSize={14}
        />
        <WorkspaceDetailsListItem
          copyId="workspace-id"
          title="Workspace ID"
          value={workspaceItem.id}
          valueFontSize={14}
        />
      </NativeListSection>
      <NativeListSection title="时间">
        <WorkspaceDetailsListItem
          copyId="workspace-modified-at"
          title="修改时间"
          value={formatDate(workspaceItem.modifiedAt)}
        />
        <WorkspaceDetailsListItem
          copyId="workspace-created-at"
          title="创建时间"
          value={formatDate(workspaceItem.createdAt)}
        />
        <WorkspaceDetailsListItem
          copyId="workspace-last-opened-at"
          title="上次打开时间"
          value={formatDate(workspaceItem.lastOpenedAt)}
        />
      </NativeListSection>
    </NativeList>
  );

  return (
    <AdaptiveModal
      name="workspace-details-sheet"
      screenName="workspace-details"
      title="工作区详情"
      open={open}
      onOpenChange={onOpenChange}
      dialogSize={{ width: 640, height: 600 }}
      sheetProps={{
        snapPoints: WORKSPACE_DETAILS_SNAP_POINTS,
      }}
    >
      {content}
    </AdaptiveModal>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    minHeight: 0,
  },
});
