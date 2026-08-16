import { Select, type SelectHandle, type SelectItemGroupData } from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";
import { compareNames, formatUnixSecondsDateTime } from "@/api/common";
import type { WorkspaceSelectSortSetting } from "@/stores/ui";

type WorkspaceSortField = "last-opened" | "created-at" | "title";
export type WorkspaceSortDirection = "ascending" | "descending";
export type WorkspaceSortValue = WorkspaceSelectSortSetting;

const WORKSPACE_SORT_ITEM_GROUPS: SelectItemGroupData[] = [
  {
    items: [
      { label: "最近打开（默认）", value: "last-opened-desc" },
      { label: "最早打开", value: "last-opened-asc" },
    ],
    key: "last-opened",
  },
  {
    items: [
      { label: "最近创建", value: "created-at-desc" },
      { label: "最早创建", value: "created-at-asc" },
    ],
    key: "created-at",
  },
  {
    items: [
      { label: "标题：A–Z", value: "title-asc" },
      { label: "标题：Z–A", value: "title-desc" },
    ],
    key: "title",
  },
];

type WorkspaceSortSelectProps = {
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: WorkspaceSortValue) => void;
  open: boolean;
  selectRef: React.RefObject<SelectHandle | null>;
  value: WorkspaceSortValue;
};

export function getWorkspaceSortConfig(sortValue: WorkspaceSortValue): {
  sortField: WorkspaceSortField;
  sortDirection: WorkspaceSortDirection;
} {
  switch (sortValue) {
    case "last-opened-desc":
      return { sortField: "last-opened", sortDirection: "descending" };
    case "last-opened-asc":
      return { sortField: "last-opened", sortDirection: "ascending" };
    case "created-at-desc":
      return { sortField: "created-at", sortDirection: "descending" };
    case "created-at-asc":
      return { sortField: "created-at", sortDirection: "ascending" };
    case "title-asc":
      return { sortField: "title", sortDirection: "ascending" };
    case "title-desc":
      return { sortField: "title", sortDirection: "descending" };
  }
}

export function getWorkspaceSortTimestamp(
  workspaceItem: WorkspaceListItem,
  sortValue: WorkspaceSortValue,
): number | null {
  const { sortField } = getWorkspaceSortConfig(sortValue);
  return sortField === "created-at" ? workspaceItem.createdAt : workspaceItem.lastOpenedAt;
}

function isWorkspaceSortValue(value: string | null): value is WorkspaceSortValue {
  return (
    value === "last-opened-desc" ||
    value === "last-opened-asc" ||
    value === "created-at-desc" ||
    value === "created-at-asc" ||
    value === "title-asc" ||
    value === "title-desc"
  );
}

export function isWorkspaceTitleSortValue(value: WorkspaceSortValue): boolean {
  return value === "title-asc" || value === "title-desc";
}

export function sortWorkspaces(
  workspaces: WorkspaceListItem[],
  sortValue: WorkspaceSortValue,
): WorkspaceListItem[] {
  const { sortDirection, sortField } = getWorkspaceSortConfig(sortValue);

  return [...workspaces].sort((left, right) => {
    if (sortField === "title") {
      return compareNames(left.displayName, right.displayName, sortDirection);
    }

    const dateField = sortField === "last-opened" ? "lastOpenedAt" : "createdAt";
    const leftDate = left[dateField];
    const rightDate = right[dateField];

    if (leftDate == null || rightDate == null) {
      if (leftDate == null && rightDate == null) {
        return compareNames(left.displayName, right.displayName);
      }

      return leftDate == null ? 1 : -1;
    }

    const comparison = leftDate - rightDate;
    return sortDirection === "ascending" ? comparison : -comparison;
  });
}

export function getWorkspaceSubtitle(
  workspaceItem: WorkspaceListItem,
  sortValue: WorkspaceSortValue,
): string {
  const { sortField } = getWorkspaceSortConfig(sortValue);
  const timestamp = getWorkspaceSortTimestamp(workspaceItem, sortValue);
  const fallbackMessage = sortField === "created-at" ? "创建时间未知" : "打开时间未知";

  return formatUnixSecondsDateTime(timestamp) ?? fallbackMessage;
}

export function WorkspaceSortSelect({
  onOpenChange,
  onValueChange,
  open,
  selectRef,
  value,
}: WorkspaceSortSelectProps) {
  return (
    <Select
      ref={selectRef}
      itemGroups={WORKSPACE_SORT_ITEM_GROUPS}
      native="native-sheet"
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        if (!isWorkspaceSortValue(nextValue)) {
          return;
        }

        onValueChange(nextValue);
      }}
      open={open}
      placeholder="排序方式"
      triggerProps={{ display: "none" }}
      value={value}
    />
  );
}
