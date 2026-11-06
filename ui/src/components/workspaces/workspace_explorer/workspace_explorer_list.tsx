import {
  FileImage,
  FileQuestion,
  FileText,
  FileVideo,
  Folder,
  Info,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { type ComponentProps, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ContextMenu,
  type ContextMenuItemData,
  NativeList,
  NativeListCustomItem,
  NativeListNavigationItem,
  NativeListSection,
  Text,
  useUiTheme,
} from "rn-ui-kit";

import type { WorkspaceIndexEntry } from "@/api/commands/workspace";
import type { StorageCapabilities } from "@/api/commands/workspace/types";
import { workspaceFile } from "@/api/commands/workspace/workspace_file";
import {
  detectWorkspaceFileKind,
  formatUnixSecondsRelativeDate,
  getFileName,
  groupItemsByDate,
  isAndroid,
  isIos17Plus,
  isMarkdownFile,
} from "@/api/common";
import { useLayoutMode } from "@/hooks/layout";
import { useWorkspaceTransfers } from "@/hooks/workspace/use_workspace_transfers";
import { workspaceSessionStore } from "@/stores/workspace/workspace_session_store";

import { createWorkspaceExplorerMenu } from "./workspace_explorer_menu";
import {
  type WorkspaceExplorerGroupMode,
  type WorkspaceExplorerSortValue,
  getWorkspaceExplorerEntryTimestamp,
  sortWorkspaceExplorerEntries,
} from "./workspace_explorer_sort";

export type WorkspaceExplorerSection = {
  entries: WorkspaceIndexEntry[];
  id: string;
  title?: string;
};

type WorkspaceExplorerListProps = {
  workspaceId: string;
  entries: WorkspaceIndexEntry[];
  foldersFirst: boolean;
  groupMode: WorkspaceExplorerGroupMode;
  hasError: boolean;
  isLoading: boolean;
  isSelectionMode: boolean;
  isUpdating: boolean;
  onDeleteEntries: (entries: WorkspaceIndexEntry[]) => void;
  onDeleteEntry: (entry: WorkspaceIndexEntry) => void;
  onEditEntry: (entry: WorkspaceIndexEntry) => void;
  onEntryDetails: (entry: WorkspaceIndexEntry) => void;
  onEntryPress: (entry: WorkspaceIndexEntry) => void;
  onRefresh: () => Promise<void>;
  onSelectedEntryPathsChange: (selectedIds: Array<string | number>) => void;
  selectedEntryPaths: string[];
  showsFloatingToolbar: boolean;
  sortValue: WorkspaceExplorerSortValue;
  tracksNavigationBarScrollEdge: boolean;
  usesNativeIosHeader: boolean;
};

function getEntryTitle(entry: WorkspaceIndexEntry): string {
  const name = getFileName(entry.path);
  return entry.fileType === "file" && isMarkdownFile(name)
    ? name.slice(0, name.lastIndexOf("."))
    : name;
}

function getUnsupportedFileSfSymbol(): "doc.fill" | "doc.questionmark.fill" {
  // doc.questionmark.fill 从 iOS 17 才可用；旧系统需要使用稳定的文档图标。
  return isIos17Plus() ? "doc.questionmark.fill" : "doc.fill";
}

export function groupWorkspaceExplorerEntries(
  entries: WorkspaceIndexEntry[],
  foldersFirst: boolean,
  groupMode: WorkspaceExplorerGroupMode,
  sortValue: WorkspaceExplorerSortValue,
): WorkspaceExplorerSection[] {
  if (groupMode === "none") {
    return [{ entries: sortWorkspaceExplorerEntries(entries, sortValue, foldersFirst), id: "all" }];
  }

  const ascending = sortValue === "lastModifiedTimeRev" || sortValue === "createTimeRev";

  return groupItemsByDate(
    entries,
    (entry) => getWorkspaceExplorerEntryTimestamp(entry, sortValue),
    ascending ? "ascending" : "descending",
  ).map((section) => ({
    entries: sortWorkspaceExplorerEntries(section.items, sortValue, foldersFirst),
    id: section.id,
    title: section.title,
  }));
}

function WorkspaceExplorerStatus({ message }: { message: string }) {
  return (
    <View style={styles.status}>
      <Text className="text-muted-foreground text-base">{message}</Text>
    </View>
  );
}

function WorkspaceExplorerEntryItem({
  entry,
  isUpdating,
  onDelete,
  onDetails,
  onEdit,
  onPress,
  sortValue,
  menuItems,
  cut = false,
}: {
  entry: WorkspaceIndexEntry;
  isUpdating: boolean;
  onDelete: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onPress: () => void;
  sortValue: WorkspaceExplorerSortValue;
  menuItems?: ContextMenuItemData[];
  cut?: boolean;
}) {
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof Folder>["color"];
  const isDirectory = entry.fileType === "directory";
  const fileKind = isDirectory ? null : detectWorkspaceFileKind(entry.path);
  const timestamp = getWorkspaceExplorerEntryTimestamp(entry, sortValue);
  const subtitle = formatUnixSecondsRelativeDate(timestamp) ?? "时间未知";
  const sharedProps = {
    contextMenuProps: {
      items: menuItems ?? [
        {
          icon: <Info color={accentColor} size={14} />,
          iconProps: { ios: { name: "info.circle" as const } },
          label: "查看详情",
          onSelect: onDetails,
          value: `details-entry-${entry.path}`,
        },
        {
          icon: <Pencil color={accentColor} size={14} />,
          iconProps: { ios: { name: "pencil" as const } },
          label: "编辑名称",
          onSelect: onEdit,
          value: `edit-entry-${entry.path}`,
        },
        {
          destructive: true,
          icon: <Trash2 color="#ff3b30" size={14} />,
          iconProps: { ios: { name: "trash" as const } },
          label: "删除",
          onSelect: onDelete,
          value: `delete-entry-${entry.path}`,
        },
      ],
    },
    disabled: isUpdating,
    style: cut ? { opacity: 0.45 } : undefined,
    icon: isDirectory ? (
      <Folder color={accentColor} fill={theme.primary} size={24} />
    ) : fileKind === "image" ? (
      <FileImage color={accentColor} size={24} />
    ) : fileKind === "video" ? (
      <FileVideo color={accentColor} size={24} />
    ) : fileKind === "unsupported" ? (
      <FileQuestion color={accentColor} size={24} />
    ) : (
      <FileText color={accentColor} size={24} />
    ),
    iconColor: theme.primary,
    iconSize: 24,
    iconSlotWidth: 30,
    nativeScrollId: entry.path,
    selectionId: entry.path,
    sfSymbol: isDirectory
      ? ("folder.fill" as const)
      : fileKind === "image"
        ? ("photo.fill" as const)
        : fileKind === "video"
          ? ("video.fill" as const)
          : fileKind === "unsupported"
            ? getUnsupportedFileSfSymbol()
            : ("doc.text.fill" as const),
    subtitle,
    title: getEntryTitle(entry),
    titleFontSize: 16,
  };

  return <NativeListNavigationItem {...sharedProps} chevron={isDirectory} onPress={onPress} />;
}

export function WorkspaceExplorerList({
  workspaceId,
  entries,
  foldersFirst,
  groupMode,
  hasError,
  isLoading,
  isSelectionMode,
  isUpdating,
  onDeleteEntry,
  onDeleteEntries,
  onEntryDetails,
  onEditEntry,
  onEntryPress,
  onRefresh,
  onSelectedEntryPathsChange,
  selectedEntryPaths,
  showsFloatingToolbar,
  sortValue,
  tracksNavigationBarScrollEdge,
  usesNativeIosHeader,
}: WorkspaceExplorerListProps) {
  const insets = useSafeAreaInsets();
  const desktop = useLayoutMode().layoutMode === "desktop";
  const transfers = useWorkspaceTransfers(workspaceId);
  const [capabilities, setCapabilities] = useState<StorageCapabilities | null>(null);
  useEffect(() => {
    let cancelled = false;
    void workspaceFile
      .capabilities(workspaceId)
      .then((value) => {
        if (!cancelled) setCapabilities(value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);
  const menuFor = (entry?: WorkspaceIndexEntry) => {
    if (!desktop || !capabilities) return undefined;
    const path = entry?.path ?? "";
    const targets = entry && selectedEntryPaths.includes(path) ? selectedEntryPaths : [path];
    return createWorkspaceExplorerMenu({
      workspaceId,
      epoch: 0,
      targetPaths: targets,
      targetDirectory:
        !entry || entry.fileType === "directory" ? path : path.split("/").slice(0, -1).join("/"),
      capabilities,
      desktop: true,
      canPaste: transfers.canPaste,
      actions: {
        isCurrent: () => workspaceSessionStore.getCurrentWorkspaceId() === workspaceId,
        open: (p) => {
          const target = entries.find((e) => e.path === p);
          if (target) onEntryPress(target);
        },
        create: () => {},
        rename: () => {
          if (entry) onEditEntry(entry);
        },
        remove: (paths) => onDeleteEntries(entries.filter((entry) => paths.includes(entry.path))),
        details: () => {
          if (entry) onEntryDetails(entry);
        },
        select: onSelectedEntryPathsChange,
        refresh: () => {
          void onRefresh();
        },
        transfer: transfers.choose,
        recordClipboard: transfers.record,
        paste: transfers.paste,
      },
    }).filter((item) => item.value !== "create-note" && item.value !== "create-directory");
  };
  const statusMessage = isLoading
    ? "正在加载文件"
    : hasError && entries.length === 0
      ? "文件加载失败"
      : entries.length === 0
        ? "当前文件夹为空"
        : null;
  const sections = groupWorkspaceExplorerEntries(entries, foldersFirst, groupMode, sortValue);

  const content = (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
      basicScrollViewProps={
        isAndroid()
          ? { customScrollbar: { insets: { bottom: insets.bottom, right: 2 } } }
          : undefined
      }
      contentInsetAdjustmentBehavior={usesNativeIosHeader ? "automatic" : undefined}
      contentMarginBottom={showsFloatingToolbar ? 120 : 24}
      editMode={isSelectionMode}
      onRefresh={onRefresh}
      onSelectedIdsChange={onSelectedEntryPathsChange}
      selectedIds={selectedEntryPaths}
      style={styles.list}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      {statusMessage ? (
        <NativeListSection>
          <NativeListCustomItem paddingVertical={0}>
            <WorkspaceExplorerStatus message={statusMessage} />
          </NativeListCustomItem>
        </NativeListSection>
      ) : (
        sections.map((section) => (
          <NativeListSection key={section.id} title={section.title}>
            {section.entries.map((entry) => (
              <WorkspaceExplorerEntryItem
                entry={entry}
                menuItems={menuFor(entry)}
                cut={transfers.cutPaths.some(
                  (p) => p === entry.path || entry.path.startsWith(`${p}/`),
                )}
                isUpdating={isUpdating}
                key={entry.path}
                onDelete={() => onDeleteEntry(entry)}
                onDetails={() => onEntryDetails(entry)}
                onEdit={() => onEditEntry(entry)}
                onPress={() => onEntryPress(entry)}
                sortValue={sortValue}
              />
            ))}
          </NativeListSection>
        ))
      )}
    </NativeList>
  );
  return desktop ? (
    <ContextMenu
      native={false}
      contentSize="sm"
      items={menuFor() ?? []}
      triggerProps={{ style: { flex: 1 } }}
      trigger={content}
    />
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  status: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
  },
});
