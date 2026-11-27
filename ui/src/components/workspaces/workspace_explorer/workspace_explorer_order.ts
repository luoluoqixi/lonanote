import type { WorkspaceIndexEntry } from "@/api/commands/workspace";
import { groupItemsByDate } from "@/api/common/utils/date_group_utils";
import { getFileName, isMarkdownFile } from "@/api/common/utils/file_type_utils";
import { compareNames } from "@/api/common/utils/name_sort_utils";
import type { WorkspaceExplorerGroupModeSetting, WorkspaceExplorerSortSetting } from "@/stores/ui";

export type WorkspaceExplorerSortValue = WorkspaceExplorerSortSetting;
export type WorkspaceExplorerGroupMode = WorkspaceExplorerGroupModeSetting;
export type WorkspaceExplorerSection = {
  entries: WorkspaceIndexEntry[];
  id: string;
  title?: string;
};

export function isWorkspaceExplorerNameSortValue(value: WorkspaceExplorerSortValue): boolean {
  return value === "name" || value === "nameRev";
}

function getWorkspaceExplorerSortName(entry: WorkspaceIndexEntry): string {
  const fileName = getFileName(entry.path);
  return entry.fileType === "file" && isMarkdownFile(fileName)
    ? fileName.slice(0, fileName.lastIndexOf("."))
    : fileName;
}

function compareNullableTimestamp(
  left: number | null,
  right: number | null,
  descending: boolean,
): number {
  if (left == null || right == null) {
    if (left == null && right == null) {
      return 0;
    }

    return left == null ? 1 : -1;
  }

  return descending ? right - left : left - right;
}

export function getWorkspaceExplorerEntryTimestamp(
  entry: WorkspaceIndexEntry,
  sortValue: WorkspaceExplorerSortValue,
): number | null {
  return sortValue === "createTime" || sortValue === "createTimeRev"
    ? entry.createTime
    : entry.lastModifiedTime;
}

export function sortWorkspaceExplorerEntries(
  entries: WorkspaceIndexEntry[],
  sortValue: WorkspaceExplorerSortValue,
  foldersFirst = true,
): WorkspaceIndexEntry[] {
  return [...entries].sort((left, right) => {
    if (foldersFirst && left.fileType !== right.fileType) {
      return left.fileType === "directory" ? -1 : 1;
    }

    const leftName = getWorkspaceExplorerSortName(left);
    const rightName = getWorkspaceExplorerSortName(right);

    if (sortValue === "name" || sortValue === "nameRev") {
      return compareNames(
        leftName,
        rightName,
        sortValue === "nameRev" ? "descending" : "ascending",
      );
    }

    const timestampComparison = compareNullableTimestamp(
      getWorkspaceExplorerEntryTimestamp(left, sortValue),
      getWorkspaceExplorerEntryTimestamp(right, sortValue),
      sortValue === "lastModifiedTime" || sortValue === "createTime",
    );

    return timestampComparison || compareNames(leftName, rightName);
  });
}

export function groupWorkspaceExplorerEntries(
  entries: WorkspaceIndexEntry[],
  foldersFirst: boolean,
  groupMode: WorkspaceExplorerGroupMode,
  sortValue: WorkspaceExplorerSortValue,
  orderingEntries: WorkspaceIndexEntry[] = entries,
): WorkspaceExplorerSection[] {
  // 排序与分组读取进入页面或主动刷新时的快照，行内容始终读取最新元数据。
  const currentEntries = new Map(entries.map((entry) => [entry.path, entry]));
  const applyCurrentMetadata = (section: WorkspaceExplorerSection): WorkspaceExplorerSection => ({
    ...section,
    entries: section.entries.flatMap((entry) => {
      const current = currentEntries.get(entry.path);
      return current ? [current] : [];
    }),
  });
  if (groupMode === "none") {
    return [
      applyCurrentMetadata({
        entries: sortWorkspaceExplorerEntries(orderingEntries, sortValue, foldersFirst),
        id: "all",
      }),
    ];
  }

  const ascending = sortValue === "lastModifiedTimeRev" || sortValue === "createTimeRev";

  return groupItemsByDate(
    orderingEntries,
    (entry) => getWorkspaceExplorerEntryTimestamp(entry, sortValue),
    ascending ? "ascending" : "descending",
  ).map((section) =>
    applyCurrentMetadata({
      entries: sortWorkspaceExplorerEntries(section.items, sortValue, foldersFirst),
      id: section.id,
      title: section.title,
    }),
  );
}
