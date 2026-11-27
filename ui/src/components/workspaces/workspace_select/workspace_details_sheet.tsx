import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { NativeList, NativeListSection } from "rn-ui-kit";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";
import { formatUnixSecondsFullDateTime, isDesktop } from "@/api/common";
import { getErrorMessage } from "@/api/common/error_message";
import { AdaptiveModal } from "@/components/common/adaptive_modal";
import { getStorageProviderLabel } from "@/components/common/storage_provider_utils";
import { useLayoutMode } from "@/hooks/layout";

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
  const desktop = useLayoutMode().layoutMode === "desktop";
  const storage = workspaceItem?.storage;
  const [rootPath, setRootPath] = useState<{ id: string; value: string } | null>(null);
  const workspaceId = workspaceItem?.id;
  useEffect(() => {
    if (!open || !workspaceId || !isDesktop()) return;
    let disposed = false;
    setRootPath(null);
    void workspace
      .nativeRootPath(workspaceId)
      .then((path) => {
        if (!disposed) setRootPath({ id: workspaceId, value: path ?? "不提供本地路径" });
      })
      .catch((error) => {
        if (!disposed)
          setRootPath({
            id: workspaceId,
            value: getErrorMessage(error, "读取路径失败"),
          });
      });
    return () => {
      disposed = true;
    };
  }, [open, workspaceId]);
  const storageKind = storage?.kind ?? workspaceItem?.storageKind;
  const storageKindLabel = storageKind === "managed" ? "应用内存储" : "外部存储";
  const localDirectoryPath = isDesktop()
    ? rootPath && rootPath.id === workspaceId
      ? rootPath.value
      : "正在读取…"
    : (storage?.directoryName ?? (storageKind === "external" ? "外部存储不提供本地路径" : "未知"));

  if (!workspaceItem) {
    return null;
  }

  const content = (
    <NativeList style={styles.list} tracksNavigationBarScrollEdge>
      <NativeListSection titleFontSize={desktop ? 12 : undefined} title="基本信息">
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
          value={`${getStorageProviderLabel(storage?.providerId)} (${formatValue(storage?.providerId)})`}
        />
        <WorkspaceDetailsListItem
          tooltip
          copyId="workspace-local-directory-path"
          title="本地文件夹路径"
          copyLabel="复制路径"
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
      <NativeListSection titleFontSize={desktop ? 12 : undefined} title="时间">
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
