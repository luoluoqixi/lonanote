import type { ContextMenuItemData } from "rn-ui-kit";

import type { StorageCapabilities } from "@/api/commands/workspace/types";

type MenuActions = {
  isCurrent(id: string, epoch: number, paths: string[]): boolean;
  open(path: string): void;
  create(parent: string, kind: "note" | "directory"): void;
  rename(path: string): void;
  remove(paths: string[]): void;
  details(path: string): void;
  select(paths: string[]): void;
  refresh(): void;
};
export function createWorkspaceExplorerMenu({
  workspaceId,
  epoch,
  targetPaths,
  targetDirectory,
  capabilities,
  actions,
}: {
  workspaceId: string;
  epoch: number;
  targetPaths: string[];
  targetDirectory: string | null;
  capabilities: Pick<
    StorageCapabilities,
    "canRead" | "canWrite" | "canCreateDirectory" | "canDelete" | "canRename"
  >;
  actions: MenuActions;
}): ContextMenuItemData[] {
  const targets = [...targetPaths];
  const single = targets.length === 1;
  const guarded =
    (action: () => void, enabled = true) =>
    () => {
      if (enabled && actions.isCurrent(workspaceId, epoch, targets)) action();
    };
  return [
    {
      value: "open",
      label: "打开",
      disabled: !single || !capabilities.canRead,
      onSelect: guarded(() => actions.open(targets[0]), single && capabilities.canRead),
    },
    {
      value: "create",
      label: "新建",
      disabled: targetDirectory === null,
      subMenu: [
        {
          value: "create-note",
          label: "笔记",
          disabled: !capabilities.canWrite,
          onSelect: guarded(
            () => actions.create(targetDirectory!, "note"),
            targetDirectory !== null && capabilities.canWrite,
          ),
        },
        {
          value: "create-directory",
          label: "文件夹",
          disabled: !capabilities.canCreateDirectory,
          onSelect: guarded(
            () => actions.create(targetDirectory!, "directory"),
            targetDirectory !== null && capabilities.canCreateDirectory,
          ),
        },
      ],
    },
    {
      value: "select",
      label: "选择",
      disabled: !targets.length,
      onSelect: guarded(() => actions.select([...targets])),
    },
    {
      value: "rename",
      label: "重命名",
      disabled: !single || !capabilities.canRename,
      onSelect: guarded(() => actions.rename(targets[0]), single && capabilities.canRename),
    },
    {
      value: "delete",
      label: "删除",
      destructive: true,
      disabled: !targets.length || !capabilities.canDelete,
      onSelect: guarded(
        () => actions.remove([...targets]),
        targets.length > 0 && capabilities.canDelete,
      ),
    },
    {
      value: "details",
      label: "详情",
      disabled: !single,
      onSelect: guarded(() => actions.details(targets[0]), single),
    },
    { value: "refresh", label: "刷新", onSelect: guarded(actions.refresh) },
  ];
}
