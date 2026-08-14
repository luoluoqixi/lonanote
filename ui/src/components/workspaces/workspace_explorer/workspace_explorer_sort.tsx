import { Select, type SelectHandle, type SelectItemGroupData } from "rn-ui-kit";

import type { FileNode } from "@/api/commands/workspace";
import type { WorkspaceExplorerGroupModeSetting, WorkspaceExplorerSortSetting } from "@/stores/ui";

export type WorkspaceExplorerSortValue = WorkspaceExplorerSortSetting;
export type WorkspaceExplorerGroupMode = WorkspaceExplorerGroupModeSetting;

const WORKSPACE_EXPLORER_SORT_GROUPS: SelectItemGroupData[] = [
  {
    key: "modified-at",
    items: [
      { label: "最近修改（默认）", value: "lastModifiedTime" },
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
  {
    key: "name",
    items: [
      { label: "名称：A–Z", value: "name" },
      { label: "名称：Z–A", value: "nameRev" },
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

export function isWorkspaceExplorerNameSortValue(value: WorkspaceExplorerSortValue): boolean {
  return value === "name" || value === "nameRev";
}

function isWorkspaceExplorerGroupMode(value: string | null): value is WorkspaceExplorerGroupMode {
  return value === "date" || value === "none";
}

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

const WORKSPACE_EXPLORER_NAME_GROUP = {
  symbol: 0,
  number: 1,
  latin: 2,
  other: 3,
} as const;

function getWorkspaceExplorerNameGroup(name: string): number {
  if (/^\p{Number}/u.test(name)) {
    return WORKSPACE_EXPLORER_NAME_GROUP.number;
  }

  if (/^\p{Script=Latin}/u.test(name)) {
    return WORKSPACE_EXPLORER_NAME_GROUP.latin;
  }

  if (/^\p{Letter}/u.test(name)) {
    return WORKSPACE_EXPLORER_NAME_GROUP.other;
  }

  return WORKSPACE_EXPLORER_NAME_GROUP.symbol;
}

function compareWorkspaceExplorerNames(
  leftName: string,
  rightName: string,
  collator: Intl.Collator,
  descending = false,
): number {
  // 分类优先级不受系统 locale 影响，倒序只反转同一分类内的名称顺序。
  const groupComparison =
    getWorkspaceExplorerNameGroup(leftName) - getWorkspaceExplorerNameGroup(rightName);
  if (groupComparison !== 0) {
    return groupComparison;
  }

  const nameComparison = collator.compare(leftName, rightName);
  return descending ? -nameComparison : nameComparison;
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
  foldersFirst = true,
): FileNode[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

  return [...entries].sort((left, right) => {
    if (foldersFirst && left.fileType !== right.fileType) {
      return left.fileType === "directory" ? -1 : 1;
    }

    const leftName = getFileName(left.path);
    const rightName = getFileName(right.path);

    if (sortValue === "name" || sortValue === "nameRev") {
      return compareWorkspaceExplorerNames(leftName, rightName, collator, sortValue === "nameRev");
    }

    const timestampComparison = compareNullableTimestamp(
      getWorkspaceExplorerEntryTimestamp(left, sortValue),
      getWorkspaceExplorerEntryTimestamp(right, sortValue),
      sortValue === "lastModifiedTime" || sortValue === "createTime",
    );

    return timestampComparison || compareWorkspaceExplorerNames(leftName, rightName, collator);
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
