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
import { type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NativeList,
  NativeListCustomItem,
  NativeListItem,
  NativeListNavigationItem,
  NativeListSection,
  Text,
  useUiTheme,
} from "rn-ui-kit";

import type { FileNode } from "@/api/commands/workspace";
import {
  detectWorkspaceFileKind,
  formatUnixSecondsRelativeDate,
  getFileName,
  groupItemsByDate,
  isAndroid,
  isIos17Plus,
  isMarkdownFile,
} from "@/api/common";

import {
  type WorkspaceExplorerGroupMode,
  type WorkspaceExplorerSortValue,
  getWorkspaceExplorerEntryTimestamp,
  sortWorkspaceExplorerEntries,
} from "./workspace_explorer_sort";

export type WorkspaceExplorerSection = {
  entries: FileNode[];
  id: string;
  title?: string;
};

type WorkspaceExplorerListProps = {
  entries: FileNode[];
  foldersFirst: boolean;
  groupMode: WorkspaceExplorerGroupMode;
  hasError: boolean;
  isLoading: boolean;
  isSelectionMode: boolean;
  isUpdating: boolean;
  onDeleteEntry: (entry: FileNode) => void;
  onEditEntry: (entry: FileNode) => void;
  onEntryDetails: (entry: FileNode) => void;
  onEntryPress: (entry: FileNode) => void;
  onRefresh: () => Promise<void>;
  onSelectedEntryPathsChange: (selectedIds: Array<string | number>) => void;
  selectedEntryPaths: string[];
  showsFloatingToolbar: boolean;
  sortValue: WorkspaceExplorerSortValue;
  tracksNavigationBarScrollEdge: boolean;
  usesNativeIosHeader: boolean;
};

function getEntryTitle(entry: FileNode): string {
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
  entries: FileNode[],
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
}: {
  entry: FileNode;
  isUpdating: boolean;
  onDelete: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onPress: () => void;
  sortValue: WorkspaceExplorerSortValue;
}) {
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof Folder>["color"];
  const isDirectory = entry.fileType === "directory";
  const fileKind = isDirectory ? null : detectWorkspaceFileKind(entry.path);
  const timestamp = getWorkspaceExplorerEntryTimestamp(entry, sortValue);
  const subtitle = formatUnixSecondsRelativeDate(timestamp) ?? "时间未知";
  const sharedProps = {
    contextMenuProps: {
      items: [
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

  if (isDirectory) {
    return <NativeListNavigationItem {...sharedProps} onPress={onPress} />;
  }

  return <NativeListItem {...sharedProps} onPress={onPress} />;
}

export function WorkspaceExplorerList({
  entries,
  foldersFirst,
  groupMode,
  hasError,
  isLoading,
  isSelectionMode,
  isUpdating,
  onDeleteEntry,
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
  const statusMessage = isLoading
    ? "正在加载文件"
    : hasError && entries.length === 0
      ? "文件加载失败"
      : entries.length === 0
        ? "当前文件夹为空"
        : null;
  const sections = groupWorkspaceExplorerEntries(entries, foldersFirst, groupMode, sortValue);

  return (
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
