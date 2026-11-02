import {
  Copy,
  EllipsisVertical,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  FolderSearch,
  Pencil,
  Redo2,
  Save,
  Undo2,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Dropdown, type DropdownItemData, Tooltip, useUiTheme } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { clipboard } from "@/api/commands/system/clipboard";
import { openExternalFile } from "@/api/commands/utils";
import { workspaceFile } from "@/api/commands/workspace";
import { getFileMimeType, isDesktop } from "@/api/common";
import { editorCommandCoordinator, saveCoordinator } from "@/components/editor/controllers";
import { toggleEditorPreviewMode } from "@/components/editor/controllers/editor_preview_mode";
import { useEditorSession } from "@/hooks/editor";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useGlobalSettings } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { getEditorTabRef } from "./editor_tab_menu_actions";

/** 标签栏固定操作区，所有动作绑定到本次挂载的活动标签。 */
export function DesktopEditorActions({
  editorId,
  onRevealInExplorer,
}: {
  editorId: string;
  onRevealInExplorer?: (workspaceId: string, path: string) => Promise<void>;
}) {
  const theme = useUiTheme();
  const { settings } = useGlobalSettings();
  const { toast } = useToast();
  const { closeEditors } = useEditorCloseActions();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { getSnapshot, editorsById, documentsById, setEditorPreferenceOverrides } =
    useEditorSession();
  const view = editorsById[editorId];
  const document = view ? documentsById[view.documentId] : null;
  const ref = getEditorTabRef(editorId, getSnapshot());
  const identity = JSON.stringify(ref);
  const latestIdentity = useRef(identity);
  latestIdentity.current = identity;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = () =>
    mounted.current &&
    latestIdentity.current === identity &&
    getSnapshot().activeEditorId === editorId &&
    JSON.stringify(getEditorTabRef(editorId, getSnapshot())) === identity;
  const [pathState, setPathState] = useState<{ identity: string; path: string | null } | null>(
    null,
  );
  const [pendingPreviewMode, setPendingPreviewMode] = useState<boolean | null>(null);
  const isSwitching = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const resolvePath = async () => {
      const target = getEditorTabRef(editorId, getSnapshot());
      const path =
        target?.kind === "looseFile"
          ? target.absolutePath
          : target?.kind === "workspaceFile" && isDesktop()
            ? await workspaceFile.nativePath(target.workspaceId, target.filePath).catch(() => null)
            : null;
      if (!cancelled) setPathState({ identity, path });
    };
    void resolvePath();
    return () => {
      cancelled = true;
    };
  }, [editorId, getSnapshot, identity]);
  const nativePath = pathState?.identity === identity ? pathState.path : null;
  const run = (operation: () => void | Promise<unknown>) => {
    if (!isCurrent()) return;
    void Promise.resolve()
      .then(() => {
        if (isCurrent()) return operation();
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "编辑器操作失败");
      });
  };
  const togglePreview = () =>
    run(async () => {
      if (isSwitching.current || !view || !ready) return;
      isSwitching.current = true;
      // 图标立即反馈目标模式，后台仍先捕获草稿再切换实际编辑状态。
      setPendingPreviewMode(!view.previewMode);
      try {
        await toggleEditorPreviewMode(editorId);
      } finally {
        isSwitching.current = false;
        if (mounted.current) setPendingPreviewMode(null);
      }
    });
  const ready = view?.bridgeState === "ready" && document?.loadState === "ready";
  const previewMode = pendingPreviewMode ?? view?.previewMode ?? false;
  const editingDisabled =
    !ready || view?.readOnly || view?.previewMode || document?.editOwnerEditorId !== editorId;
  const sourceMode = view?.preferenceOverrides.sourceMode ?? settings.editorDefaults.sourceMode;
  const icon = (Icon: typeof Save) => <Icon size={14} color={theme.mutedForeground} />;
  const items: DropdownItemData[] =
    view && document
      ? [
          {
            value: "save",
            label: "保存",
            icon: icon(Save),
            disabled: !ready || document.saveState === "saving",
            onPress: () => run(() => saveCoordinator.flushDocument(document.documentId)),
          },
          { value: "separator-history", separator: true },
          {
            value: "undo",
            label: "撤销",
            icon: icon(Undo2),
            disabled: editingDisabled || !view.editorState.canUndo,
            onPress: () =>
              run(() => editorCommandCoordinator.execute(editorId, { type: "history.undo" })),
          },
          {
            value: "redo",
            label: "重做",
            icon: icon(Redo2),
            disabled: editingDisabled || !view.editorState.canRedo,
            onPress: () =>
              run(() => editorCommandCoordinator.execute(editorId, { type: "history.redo" })),
          },
          { value: "separator-mode", separator: true },
          {
            value: "preview-mode",
            label: previewMode ? "编辑模式" : "预览模式",
            icon: icon(previewMode ? Pencil : Eye),
            disabled: !ready,
            onPress: togglePreview,
          },
          {
            value: "source-mode",
            label: "源码模式",
            icon: icon(FileText),
            selected: !view.previewMode && sourceMode,
            disabled: !ready || view.previewMode,
            onPress: () =>
              run(() => setEditorPreferenceOverrides(editorId, { sourceMode: !sourceMode })),
          },
        ]
      : [];
  items.push(
    { value: "separator-file", separator: true },
    {
      value: "reveal-explorer",
      label: "在资源管理器中显示",
      icon: icon(FolderSearch),
      disabled:
        ref?.kind !== "workspaceFile" ||
        ref.workspaceId !== currentWorkspaceId ||
        !onRevealInExplorer,
      onPress: () =>
        run(() =>
          ref?.kind === "workspaceFile"
            ? onRevealInExplorer?.(ref.workspaceId, ref.filePath)
            : undefined,
        ),
    },
    {
      value: "reveal-file",
      label: "在文件管理器中显示",
      icon: icon(FolderOpen),
      disabled: !nativePath || !isDesktop(),
      onPress: () => run(() => (nativePath ? fs.showInFolder(nativePath) : undefined)),
    },
    {
      value: "open-external",
      label: "在其他应用中打开",
      icon: icon(ExternalLink),
      disabled: !nativePath || !isDesktop(),
      onPress: () =>
        run(() =>
          nativePath ? openExternalFile(nativePath, getFileMimeType(nativePath)) : undefined,
        ),
    },
    { value: "separator-path", separator: true },
    {
      value: "copy-path",
      label: "复制路径",
      icon: icon(Copy),
      disabled: !nativePath,
      onPress: () =>
        run(() => {
          if (nativePath) {
            toast.success(`${nativePath}`);
            return clipboard.writeText(nativePath);
          }
        }),
    },
    {
      value: "copy-relative-path",
      label: "复制相对路径",
      icon: icon(Copy),
      disabled: ref?.kind !== "workspaceFile",
      onPress: () =>
        run(() => {
          if (ref?.kind === "workspaceFile") {
            toast.success(`${ref.filePath}`);
            return clipboard.writeText(ref.filePath);
          }
        }),
    },
    { value: "separator-close", separator: true },
    {
      value: "close-editor",
      label: "关闭编辑器",
      icon: icon(X),
      onPress: () => run(() => closeEditors([editorId])),
    },
  );
  const label = previewMode ? "切换到编辑模式" : "切换到预览模式";
  const PreviewIcon = previewMode ? Pencil : Eye;
  return (
    <View style={styles.actions}>
      {view && (ready || pendingPreviewMode !== null) ? (
        <Tooltip content={label}>
          <Button
            aria-label={label}
            variant="ghost"
            size="sm"
            buttonSize={{ width: 28, height: 28 }}
            onPress={togglePreview}
          >
            <PreviewIcon size={16} color={theme.mutedForeground} />
          </Button>
        </Tooltip>
      ) : null}
      <Dropdown
        items={items}
        contentSize="sm"
        contentProps={{ align: "end" }}
        nativeTrigger
        nativeTriggerIcon="none"
        nativeTriggerContainerStyle={{ padding: 0, paddingHorizontal: 0, gap: 0 }}
        nativeTriggerProps={{
          accessibilityLabel: "更多选项",
          size: "2xs",
          style: { width: 28, height: 28, padding: 0 },
        }}
        triggerLabel={<EllipsisVertical size={16} color={theme.mutedForeground} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 2,
    paddingHorizontal: 4,
  },
});
