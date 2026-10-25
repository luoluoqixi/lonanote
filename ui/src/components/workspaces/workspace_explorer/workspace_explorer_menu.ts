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
  reveal?(path: string): void;
  copyPath?(path: string, absolute: boolean): void;
};
export function createWorkspaceExplorerMenu({
  workspaceId,
  epoch,
  targetPaths,
  targetDirectory,
  capabilities,
  actions,
  desktop = false,
  nativePathAvailable = false,
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
  desktop?: boolean;
  nativePathAvailable?: boolean;
}): ContextMenuItemData[] {
  const targets = [...targetPaths];
  const single = targets.length === 1;
  const directory = single && targets[0] === targetDirectory;
  const root = single && targets[0] === "";
  const guarded =
    (action: () => void, enabled = true) =>
    () => {
      if (enabled && actions.isCurrent(workspaceId, epoch, targets)) action();
    };
  if (desktop)
    return [
      ...(directory
        ? [
            {
              value: "create-note",
              label: "新建笔记",
              disabled: !capabilities.canWrite,
              onSelect: guarded(
                () => actions.create(targetDirectory!, "note"),
                targetDirectory !== null && capabilities.canWrite,
              ),
            },
            {
              value: "create-directory",
              label: "新建文件夹",
              disabled: !capabilities.canCreateDirectory,
              onSelect: guarded(
                () => actions.create(targetDirectory!, "directory"),
                targetDirectory !== null && capabilities.canCreateDirectory,
              ),
            },
          ]
        : [
            {
              value: "open",
              label: "打开",
              disabled: !single || !capabilities.canRead,
              onSelect: guarded(() => actions.open(targets[0]), single && capabilities.canRead),
            },
          ]),
      { value: "separator-primary", separator: true },
      ...(nativePathAvailable
        ? [
            {
              value: "reveal",
              label: "在文件管理器中显示",
              disabled: !single,
              onSelect: guarded(() => actions.reveal?.(targets[0]), single),
            },
            { value: "separator-reveal", separator: true },
          ]
        : []),
      ...(nativePathAvailable
        ? [
            {
              value: "copy-absolute",
              label: "复制绝对路径",
              disabled: !single,
              onSelect: guarded(() => actions.copyPath?.(targets[0], true), single),
            },
          ]
        : []),
      {
        value: "copy-relative",
        label: "复制相对路径",
        disabled: !single,
        onSelect: guarded(() => actions.copyPath?.(targets[0], false), single),
      },
      { value: "separator-path", separator: true },
      ...(root
        ? []
        : [
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
          ]),
      {
        value: "details",
        label: "查看详情",
        disabled: !single,
        onSelect: guarded(() => actions.details(targets[0]), single),
      },
    ];
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
