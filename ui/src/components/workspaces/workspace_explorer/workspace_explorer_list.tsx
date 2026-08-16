import { FileText, Folder, Pencil, Trash2 } from "@tamagui/lucide-icons-2";
import { type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import {
  NativeList,
  NativeListCustomItem,
  NativeListItem,
  NativeListNavigationItem,
  NativeListSection,
  Text,
  useTheme,
} from "rn-ui-kit";

import type { FileNode } from "@/api/commands/workspace";
import {
  formatUnixSecondsRelativeDate,
  getFileName,
  groupItemsByDate,
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
      <Text color="$gray11" fontSize="$4">
        {message}
      </Text>
    </View>
  );
}

function WorkspaceExplorerEntryItem({
  entry,
  isUpdating,
  onDelete,
  onEdit,
  onPress,
  sortValue,
}: {
  entry: FileNode;
  isUpdating: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onPress: () => void;
  sortValue: WorkspaceExplorerSortValue;
}) {
  const theme = useTheme();
  const accentColor = theme.color10.val as ComponentProps<typeof Folder>["color"];
  const isDirectory = entry.fileType === "directory";
  const timestamp = getWorkspaceExplorerEntryTimestamp(entry, sortValue);
  const subtitle = formatUnixSecondsRelativeDate(timestamp) ?? "时间未知";
  const sharedProps = {
    contextMenuProps: {
      items: [
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
      <Folder color={accentColor} fill={theme.color10.val} size={24} />
    ) : (
      <FileText color={accentColor} size={24} />
    ),
    iconColor: theme.color10.val,
    iconSize: 24,
    iconSlotWidth: 30,
    nativeScrollId: entry.path,
    selectionId: entry.path,
    sfSymbol: isDirectory ? ("folder.fill" as const) : ("doc.text.fill" as const),
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
