import { FileText, Folder, Pencil, Trash2 } from "@tamagui/lucide-icons-2";
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
import { formatUnixSecondsDateTime, getFileName, isMarkdownFile } from "@/api/common";

import {
  type WorkspaceExplorerGroupMode,
  type WorkspaceExplorerSortValue,
  getWorkspaceExplorerEntryTimestamp,
} from "./workspace_explorer_sort";

export type WorkspaceExplorerSection = {
  entries: FileNode[];
  id: string;
  title?: string;
};

type WorkspaceExplorerListProps = {
  entries: FileNode[];
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
  sortValue: WorkspaceExplorerSortValue;
  tracksNavigationBarScrollEdge: boolean;
};

function getEntryTitle(entry: FileNode): string {
  const name = getFileName(entry.path);
  return entry.fileType === "file" && isMarkdownFile(name)
    ? name.slice(0, name.lastIndexOf("."))
    : name;
}

function getStartOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getDateGroupKey(timestamp: number | null): string {
  if (timestamp == null) {
    return "unknown";
  }

  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  const now = new Date();
  const dayDifference = Math.round((getStartOfDay(now) - getStartOfDay(date)) / 86_400_000);

  if (dayDifference === 0) {
    return "today";
  }
  if (dayDifference === 1) {
    return "yesterday";
  }
  if (date.getFullYear() === now.getFullYear()) {
    return `month-${date.getMonth() + 1}`;
  }

  return `year-${date.getFullYear()}`;
}

function getDateGroupTitle(timestamp: number | null): string {
  const key = getDateGroupKey(timestamp);

  if (key === "today") {
    return "今天";
  }
  if (key === "yesterday") {
    return "昨天";
  }
  if (key === "unknown") {
    return "日期未知";
  }
  if (key.startsWith("month-")) {
    return `${key.slice("month-".length)}月`;
  }

  return `${key.slice("year-".length)}年`;
}

export function groupWorkspaceExplorerEntries(
  entries: FileNode[],
  groupMode: WorkspaceExplorerGroupMode,
  sortValue: WorkspaceExplorerSortValue,
): WorkspaceExplorerSection[] {
  if (groupMode === "none") {
    return [{ entries, id: "all" }];
  }

  const sectionById = new Map<
    string,
    WorkspaceExplorerSection & { representativeTimestamp: number | null }
  >();

  for (const entry of entries) {
    const timestamp = getWorkspaceExplorerEntryTimestamp(entry, sortValue);
    const groupKey = getDateGroupKey(timestamp);
    const section = sectionById.get(groupKey);

    if (section) {
      section.entries.push(entry);
    } else {
      sectionById.set(groupKey, {
        entries: [entry],
        id: groupKey,
        representativeTimestamp: timestamp,
        title: getDateGroupTitle(timestamp),
      });
    }
  }

  const ascending = sortValue === "lastModifiedTimeRev" || sortValue === "createTimeRev";

  return [...sectionById.values()]
    .sort((left, right) => {
      if (left.representativeTimestamp == null || right.representativeTimestamp == null) {
        if (left.representativeTimestamp == null && right.representativeTimestamp == null) {
          return 0;
        }

        return left.representativeTimestamp == null ? 1 : -1;
      }

      return ascending
        ? left.representativeTimestamp - right.representativeTimestamp
        : right.representativeTimestamp - left.representativeTimestamp;
    })
    .map(({ entries: sectionEntries, id, title }) => ({
      entries: sectionEntries,
      id,
      title,
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
  const isDirectory = entry.fileType === "directory";
  const timestamp = getWorkspaceExplorerEntryTimestamp(entry, sortValue);
  const subtitle = formatUnixSecondsDateTime(timestamp) ?? "时间未知";
  const sharedProps = {
    contextMenuProps: {
      items: [
        {
          icon: <Pencil color="$color10" size={14} />,
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
      <Folder color="$color10" fill="$color10" size={24} />
    ) : (
      <FileText color="$color10" size={24} />
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
  sortValue,
  tracksNavigationBarScrollEdge,
}: WorkspaceExplorerListProps) {
  const statusMessage = isLoading
    ? "正在加载文件"
    : hasError && entries.length === 0
      ? "文件加载失败"
      : entries.length === 0
        ? "当前文件夹为空"
        : null;
  const sections = groupWorkspaceExplorerEntries(entries, groupMode, sortValue);

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      contentMarginBottom={120}
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
