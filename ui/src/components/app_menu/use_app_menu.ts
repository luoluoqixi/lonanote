import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";
import { isDesktop, isTauri, os } from "@/api/common/platform";
import { useAppEditActions } from "@/hooks/editor/use_app_edit_actions";
import { useAppSaveActions } from "@/hooks/editor/use_app_save_actions";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useEditorFileActions } from "@/hooks/editor/use_editor_file_actions";
import { useLayoutMode } from "@/hooks/layout";
import { useDesktopViewActions } from "@/hooks/settings/use_desktop_view_actions";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId } from "@/hooks/workspace";
import { useWorkspaceCatalogRevision } from "@/hooks/workspace/use_workspace_catalog_revision";
import { useWorkspaceLocation } from "@/hooks/workspace/use_workspace_location";
import { useWorkspaceOpenActions } from "@/hooks/workspace/use_workspace_open_actions";

import {
  type AppMenuActionId,
  type AppMenuGroup,
  type AppMenuNode,
  getRecentWorkspaces,
  resolveAppMenuPresentation,
} from "./app_menu_model";
import { openAppSettings } from "./app_settings_actions";
import { useAppViewShortcuts } from "./use_app_view_shortcuts";

export function useAppMenu() {
  const { layoutMode } = useLayoutMode();
  const platform = os();
  const presentation = resolveAppMenuPresentation(platform, isTauri(), layoutMode);
  const desktop = isDesktop();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { revision } = useWorkspaceCatalogRevision();
  const router = useRouter();
  const [settings, setSettings] = useState<{ open: boolean; page: "global" | "about" }>({
    open: false,
    page: "global",
  });
  const openSettings = (page: "global" | "about" = "global") =>
    openAppSettings(layoutMode, page, {
      openDialog: (page) => setSettings({ open: true, page }),
      navigate: (route) => router.push(route as Href),
    });
  const { toast } = useToast();
  const files = useEditorFileActions();
  const saves = useAppSaveActions();
  const edits = useAppEditActions();
  const view = useDesktopViewActions();
  const { requestAppExit } = useEditorCloseActions();
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const alive = useRef(true);
  const refresh = useCallback(async () => {
    const items = await workspace.list();
    if (alive.current) setWorkspaces(items);
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh().catch(() => undefined);
    return () => {
      alive.current = false;
    };
  }, [refresh, currentWorkspaceId, revision]);
  const locationBusy = useRef(false);
  const location = useWorkspaceLocation({
    busyRef: locationBusy,
    isBlocked: () => false,
    onChanged: refresh,
  });
  const opening = useWorkspaceOpenActions({
    onChanged: refresh,
    onMissing: (item) => location.open(item, "rebind"),
    onOpened: () => {
      if (layoutMode === "mobile") router.replace("/workspace" as Href);
    },
  });
  const mod = platform === "macos" || platform === "ios" ? "Cmd" : "Ctrl";
  const item = (
    title: string,
    action: AppMenuActionId,
    enabled = true,
    shortcut?: string,
  ): AppMenuNode => ({ type: "item", title, action, enabled, shortcut });
  const sep: AppMenuNode = { type: "separator" };
  const recent = getRecentWorkspaces(workspaces);
  const groups: AppMenuGroup[] = [
    {
      id: "file",
      title: "文件",
      items: [
        item("新建文件", "newFile", Boolean(currentWorkspaceId && !files.busy)),
        item("新建文件夹", "newFolder", Boolean(currentWorkspaceId && !files.busy)),
        ...(desktop ? [item("新建窗口", "newWindow")] : []),
        sep,
        item("打开文件", "openFile", desktop),
        item("打开文件夹", "openFolder", desktop && !opening.busy),
        {
          type: "submenu",
          title: "打开最近的工作区",
          items: recent.length
            ? recent.map((entry) =>
                item(
                  `${entry.displayName}${recent.filter((other) => other.displayName === entry.displayName).length > 1 ? ` (${entry.storage.providerId} · ${entry.id})` : ""}`,
                  `workspace:${entry.id}`,
                  !opening.busy,
                ),
              )
            : [item("暂无最近工作区", "newWindow", false)],
        },
        sep,
        item("保存", "save", saves.canSave),
        item("全部保存", "saveAll", saves.canSaveAll),
        sep,
        item("设置", "settings"),
        ...(desktop && platform !== "macos" ? [sep, item("退出", "quit")] : []),
      ],
    },
    {
      id: "edit",
      title: "编辑",
      items: [
        item("撤销", "undo", edits.enabled.undo, `${mod}+Z`),
        item("重做", "redo", edits.enabled.redo, mod === "Cmd" ? "Cmd+Shift+Z" : "Ctrl+Y"),
        sep,
        ...(["cut", "copy", "paste"] as const).map((action, index) =>
          item(
            ["剪切", "复制", "粘贴"][index],
            action,
            edits.enabled[action],
            `${mod}+${["X", "C", "V"][index]}`,
          ),
        ),
      ],
    },
    {
      id: "selection",
      title: "选择",
      items: [item("全选", "selectAll", edits.enabled.selectAll, `${mod}+A`)],
    },
    {
      id: "view",
      title: "视图",
      items: [
        item("放大", "zoomIn", view.canZoomIn, `${mod}++`),
        item("缩小", "zoomOut", view.canZoomOut, `${mod}+-`),
        item("实际大小", "zoomReset", desktop, `${mod}+0`),
        sep,
        item("切换全屏", "toggleFullscreen", view.fullscreenReady, "F11"),
      ],
    },
    { id: "help", title: "帮助", items: [item("关于", "about")] },
  ];
  const execute = async (action: AppMenuActionId) => {
    try {
      if (action.startsWith("workspace:")) {
        await opening.openWorkspace(action.slice(10));
        return;
      }
      switch (action) {
        case "zoomIn":
          await view.zoomIn();
          break;
        case "zoomOut":
          await view.zoomOut();
          break;
        case "zoomReset":
          await view.resetZoom();
          break;
        case "toggleFullscreen":
          await view.toggleFullscreen();
          break;
        case "newFile":
          await files.createNote();
          break;
        case "newFolder":
          await files.createDirectory();
          break;
        case "newWindow":
          break;
        case "openFile":
          await files.openLooseFile();
          break;
        case "openFolder":
          await opening.openFolder();
          break;
        case "save":
          await saves.saveActive();
          break;
        case "saveAll":
          await saves.saveAll();
          break;
        case "settings":
          openSettings("global");
          break;
        case "about":
          openSettings("about");
          break;
        case "quit":
          await requestAppExit();
          break;
        case "undo":
        case "redo":
        case "cut":
        case "copy":
        case "paste":
        case "selectAll":
          await edits.execute(action);
          break;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "菜单操作失败");
    }
  };
  useAppViewShortcuts(execute);
  return {
    groups,
    settings,
    openSettings,
    setSettingsOpen: (open: boolean) => setSettings((current) => ({ ...current, open })),
    execute,
    presentation,
    refresh,
    location,
    captureEditTarget: edits.captureTarget,
  };
}
