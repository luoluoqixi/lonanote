import { Select, type SelectHandle, type SelectItemGroupData } from "rn-ui-kit";

import type { WorkspaceListItem } from "@/api/commands/workspace";
import { groupItemsByDate } from "@/api/common";
import type { WorkspaceSelectGroupModeSetting } from "@/stores/ui";

import {
  type WorkspaceSortValue,
  getWorkspaceSortConfig,
  getWorkspaceSortTimestamp,
} from "./workspace_sort";

export type WorkspaceGroupMode = WorkspaceSelectGroupModeSetting;

export type WorkspaceSelectSection = {
  id: string;
  title?: string;
  workspaces: WorkspaceListItem[];
};

const WORKSPACE_GROUP_MODE_GROUPS: SelectItemGroupData[] = [
  {
    key: "group-mode",
    items: [
      { label: "按日期分组（默认）", value: "date" },
      { label: "按存储位置分组", value: "storage" },
      { label: "不分组", value: "none" },
    ],
  },
];

function isWorkspaceGroupMode(value: string | null): value is WorkspaceGroupMode {
  return value === "date" || value === "storage" || value === "none";
}

export function groupWorkspaces(
  workspaces: WorkspaceListItem[],
  groupMode: WorkspaceGroupMode,
  sortValue: WorkspaceSortValue,
): WorkspaceSelectSection[] {
  if (groupMode === "none") {
    return [{ id: "all", title: "选择工作区", workspaces }];
  }

  if (groupMode === "storage") {
    const managedWorkspaces = workspaces.filter(
      (workspaceItem) => workspaceItem.storageKind === "managed",
    );
    const externalWorkspaces = workspaces.filter(
      (workspaceItem) => workspaceItem.storageKind === "external",
    );

    return [
      { id: "storage-managed", title: "应用内存储", workspaces: managedWorkspaces },
      { id: "storage-external", title: "外部存储", workspaces: externalWorkspaces },
    ].filter((section) => section.workspaces.length > 0);
  }

  const { sortDirection, sortField } = getWorkspaceSortConfig(sortValue);
  const dateGroupDirection = sortField === "title" ? "descending" : sortDirection;

  return groupItemsByDate(
    workspaces,
    (workspaceItem) => getWorkspaceSortTimestamp(workspaceItem, sortValue),
    dateGroupDirection,
  ).map((section) => ({
    id: section.id,
    title: section.title,
    workspaces: section.items,
  }));
}

type WorkspaceGroupModeSelectProps = {
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: WorkspaceGroupMode) => void;
  open: boolean;
  selectRef: React.RefObject<SelectHandle | null>;
  value: WorkspaceGroupMode;
};

export function WorkspaceGroupModeSelect({
  onOpenChange,
  onValueChange,
  open,
  selectRef,
  value,
}: WorkspaceGroupModeSelectProps) {
  return (
    <Select
      ref={selectRef}
      itemGroups={WORKSPACE_GROUP_MODE_GROUPS}
      native="sheet"
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        if (isWorkspaceGroupMode(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      placeholder="分组方式"
      triggerProps={{ style: { display: "none" } }}
      value={value}
    />
  );
}
