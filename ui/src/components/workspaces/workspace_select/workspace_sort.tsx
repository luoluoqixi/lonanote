import { Select, type SelectHandle, type SelectItemGroupData } from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";
import { compareNames, formatUnixSecondsRelativeDate } from "@/api/common";
import type { WorkspaceSelectSortSetting } from "@/stores/ui";

type WorkspaceSortField = "modified-at" | "last-opened" | "created-at" | "title";
export type WorkspaceSortDirection = "ascending" | "descending";
export type WorkspaceSortValue = WorkspaceSelectSortSetting;

const WORKSPACE_SORT_ITEM_GROUPS: SelectItemGroupData[] = [
  {
    items: [
      { label: "最近修改（默认）", value: "modified-at-desc" },
      { label: "最早修改", value: "modified-at-asc" },
    ],
    key: "modified-at",
  },
  {
    items: [
      { label: "最近打开", value: "last-opened-desc" },
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
    case "modified-at-desc":
      return { sortField: "modified-at", sortDirection: "descending" };
    case "modified-at-asc":
      return { sortField: "modified-at", sortDirection: "ascending" };
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
  if (sortField === "modified-at") {
    return workspaceItem.modifiedAt ?? null;
  }
  return sortField === "created-at" ? workspaceItem.createdAt : workspaceItem.lastOpenedAt;
}

function isWorkspaceSortValue(value: string | null): value is WorkspaceSortValue {
  return (
    value === "modified-at-desc" ||
    value === "modified-at-asc" ||
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

    const leftDate = getWorkspaceSortTimestamp(left, sortValue);
    const rightDate = getWorkspaceSortTimestamp(right, sortValue);

    if (leftDate == null || rightDate == null) {
      if (leftDate == null && rightDate == null) {
        return compareNames(left.displayName, right.displayName);
      }

      return leftDate == null ? 1 : -1;
    }

    const comparison = leftDate - rightDate;
    if (comparison === 0) {
      return compareNames(left.displayName, right.displayName);
    }
    return sortDirection === "ascending" ? comparison : -comparison;
  });
}

export function getWorkspaceSubtitle(
  workspaceItem: WorkspaceListItem,
  sortValue: WorkspaceSortValue,
): string {
  const { sortField } = getWorkspaceSortConfig(sortValue);
  const timestamp = getWorkspaceSortTimestamp(workspaceItem, sortValue);
  const fallbackMessage =
    sortField === "modified-at"
      ? "修改时间未知"
      : sortField === "created-at"
        ? "创建时间未知"
        : "打开时间未知";

  return formatUnixSecondsRelativeDate(timestamp) ?? fallbackMessage;
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
      native="sheet"
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        if (!isWorkspaceSortValue(nextValue)) {
          return;
        }

        onValueChange(nextValue);
      }}
      placeholder="排序方式"
      triggerProps={{ style: { display: "none" } }}
      value={value}
    />
  );
}
