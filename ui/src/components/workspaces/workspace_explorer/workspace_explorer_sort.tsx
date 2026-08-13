import { Select, type SelectHandle, type SelectItemGroupData } from "rn-ui-kit";

import type { FileNode, FileTreeSortType } from "@/api/commands/workspace";

export type WorkspaceExplorerSortValue = FileTreeSortType;
export type WorkspaceExplorerGroupMode = "date" | "none";

export const DEFAULT_WORKSPACE_EXPLORER_SORT_VALUE: WorkspaceExplorerSortValue = "name";
export const DEFAULT_WORKSPACE_EXPLORER_GROUP_MODE: WorkspaceExplorerGroupMode = "date";

const WORKSPACE_EXPLORER_SORT_GROUPS: SelectItemGroupData[] = [
  {
    key: "name",
    items: [
      { label: "名称：A–Z", value: "name" },
      { label: "名称：Z–A", value: "nameRev" },
    ],
  },
  {
    key: "modified-at",
    items: [
      { label: "最近修改", value: "lastModifiedTime" },
      { label: "最早修改", value: "lastModifiedTimeRev" },
    ],
  },
  {
    key: "created-at",
    items: [
      { label: "最近创建", value: "createTime" },
      { label: "最早创建", value: "createTimeRev" },
    ],
  },
];

const WORKSPACE_EXPLORER_GROUP_MODE_GROUPS: SelectItemGroupData[] = [
  {
    key: "group-mode",
    items: [
      { label: "按日期分组", value: "date" },
      { label: "不分组", value: "none" },
    ],
  },
];

function isWorkspaceExplorerSortValue(value: string | null): value is WorkspaceExplorerSortValue {
  return (
    value === "name" ||
    value === "nameRev" ||
    value === "lastModifiedTime" ||
    value === "lastModifiedTimeRev" ||
    value === "createTime" ||
    value === "createTimeRev"
  );
}

function isWorkspaceExplorerGroupMode(value: string | null): value is WorkspaceExplorerGroupMode {
  return value === "date" || value === "none";
}

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
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
  entry: FileNode,
  sortValue: WorkspaceExplorerSortValue,
): number | null {
  return sortValue === "createTime" || sortValue === "createTimeRev"
    ? entry.createTime
    : entry.lastModifiedTime;
}

export function sortWorkspaceExplorerEntries(
  entries: FileNode[],
  sortValue: WorkspaceExplorerSortValue,
): FileNode[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  return [...entries].sort((left, right) => {
    if (left.fileType !== right.fileType) {
      return left.fileType === "directory" ? -1 : 1;
    }

    const leftName = getFileName(left.path);
    const rightName = getFileName(right.path);

    if (sortValue === "name" || sortValue === "nameRev") {
      const comparison = collator.compare(leftName, rightName);
      return sortValue === "name" ? comparison : -comparison;
    }

    const timestampComparison = compareNullableTimestamp(
      getWorkspaceExplorerEntryTimestamp(left, sortValue),
      getWorkspaceExplorerEntryTimestamp(right, sortValue),
      sortValue === "lastModifiedTime" || sortValue === "createTime",
    );

    return timestampComparison || collator.compare(leftName, rightName);
  });
}

type WorkspaceExplorerSortSelectProps = {
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: WorkspaceExplorerSortValue) => void;
  open: boolean;
  selectRef: React.RefObject<SelectHandle | null>;
  value: WorkspaceExplorerSortValue;
};

export function WorkspaceExplorerSortSelect({
  onOpenChange,
  onValueChange,
  open,
  selectRef,
  value,
}: WorkspaceExplorerSortSelectProps) {
  return (
    <Select
      ref={selectRef}
      itemGroups={WORKSPACE_EXPLORER_SORT_GROUPS}
      native="native-sheet"
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        if (isWorkspaceExplorerSortValue(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      open={open}
      placeholder="排序方式"
      triggerProps={{ display: "none" }}
      value={value}
    />
  );
}

type WorkspaceExplorerGroupModeSelectProps = {
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: WorkspaceExplorerGroupMode) => void;
  open: boolean;
  selectRef: React.RefObject<SelectHandle | null>;
  value: WorkspaceExplorerGroupMode;
};

export function WorkspaceExplorerGroupModeSelect({
  onOpenChange,
  onValueChange,
  open,
  selectRef,
  value,
}: WorkspaceExplorerGroupModeSelectProps) {
  return (
    <Select
      ref={selectRef}
      itemGroups={WORKSPACE_EXPLORER_GROUP_MODE_GROUPS}
      native="native-sheet"
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        if (isWorkspaceExplorerGroupMode(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      open={open}
      placeholder="分组方式"
      triggerProps={{ display: "none" }}
      value={value}
    />
  );
}
