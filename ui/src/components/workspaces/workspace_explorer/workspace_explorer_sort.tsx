import { Select, type SelectHandle, type SelectItemGroupData } from "rn-ui-kit";

import type {
  WorkspaceExplorerGroupMode,
  WorkspaceExplorerSortValue,
} from "./workspace_explorer_order";

export {
  type WorkspaceExplorerGroupMode,
  type WorkspaceExplorerSortValue,
  getWorkspaceExplorerEntryTimestamp,
  isWorkspaceExplorerNameSortValue,
  sortWorkspaceExplorerEntries,
} from "./workspace_explorer_order";

export const WORKSPACE_EXPLORER_SORT_GROUPS = [
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
] satisfies SelectItemGroupData[];

const WORKSPACE_EXPLORER_GROUP_MODE_GROUPS: SelectItemGroupData[] = [
  {
    key: "group-mode",
    items: [
      { label: "按日期分组", value: "date" },
      { label: "不分组", value: "none" },
    ],
  },
];

export function isWorkspaceExplorerSortValue(
  value: string | null,
): value is WorkspaceExplorerSortValue {
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

type WorkspaceExplorerSortSelectProps = {
  onValueChange: (value: WorkspaceExplorerSortValue) => void;
  selectRef: React.RefObject<SelectHandle | null>;
  value: WorkspaceExplorerSortValue;
};

export function WorkspaceExplorerSortSelect({
  onValueChange,
  selectRef,
  value,
}: WorkspaceExplorerSortSelectProps) {
  return (
    <Select
      ref={selectRef}
      itemGroups={WORKSPACE_EXPLORER_SORT_GROUPS}
      native="sheet"
      onValueChange={(nextValue) => {
        if (isWorkspaceExplorerSortValue(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      placeholder="排序方式"
      triggerProps={{ style: { display: "none" } }}
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
  selectRef,
  value,
}: WorkspaceExplorerGroupModeSelectProps) {
  return (
    <Select
      ref={selectRef}
      itemGroups={WORKSPACE_EXPLORER_GROUP_MODE_GROUPS}
      native="sheet"
      onOpenChange={onOpenChange}
      onValueChange={(nextValue) => {
        if (isWorkspaceExplorerGroupMode(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      placeholder="分组方式"
      triggerProps={{ style: { display: "none" } }}
      value={value}
    />
  );
}
