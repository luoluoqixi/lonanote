import { type ReactElement, useEffect, useState } from "react";
import { View } from "react-native";
import { ContextMenu, type ContextMenuItemData } from "rn-ui-kit";

import { workspaceFile } from "@/api/commands/workspace";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { useLayoutMode } from "@/hooks/layout";
import { useWorkspaceResourceRevision } from "@/hooks/workspace/use_workspace_resource_revision";
import type { EditorDocumentRef } from "@/stores/editor";

/** 路径提前解析；打开时冻结菜单，避免异步结果改变正在操作的菜单。 */
export function EditorTabInput({
  children,
  documentRef,
  getItems,
  suppressTooltip = false,
}: {
  children: ReactElement;
  documentRef: EditorDocumentRef | null;
  getItems: (nativePath: string | null) => ContextMenuItemData[];
  suppressTooltip?: boolean;
}) {
  const { layoutMode } = useLayoutMode();
  const revision = useWorkspaceResourceRevision(
    documentRef?.kind === "workspaceFile" ? documentRef.workspaceId : null,
  );
  const [resolved, setResolved] = useState<{
    ref: EditorDocumentRef;
    revision: number;
    path: string | null;
  } | null>(null);
  const [frozenItems, setFrozenItems] = useState<ContextMenuItemData[] | null>(null);
  useEffect(() => {
    if (documentRef?.kind !== "workspaceFile") return;
    let disposed = false;
    void workspaceFile
      .nativePath(documentRef.workspaceId, documentRef.filePath)
      .catch(() => null)
      .then((path) => {
        if (!disposed) setResolved({ ref: documentRef, revision, path });
      });
    return () => {
      disposed = true;
    };
  }, [documentRef, revision]);
  const nativePath =
    documentRef?.kind === "looseFile"
      ? documentRef.absolutePath
      : resolved?.ref === documentRef && resolved?.revision === revision
        ? resolved.path
        : null;
  const tooltipPath =
    nativePath ?? (documentRef?.kind === "workspaceFile" ? documentRef.filePath : null);
  const canShowTooltip =
    layoutMode === "desktop" && !!tooltipPath && !suppressTooltip && frozenItems === null;
  return (
    <FilePathTooltip path={tooltipPath} disabled={!canShowTooltip}>
      {/* 容器只承载悬浮事件；覆盖 Tooltip 注入的 button role，避免嵌套关闭按钮。 */}
      <View role="presentation" style={{ flexShrink: 0, height: 36 }}>
        <ContextMenu
          native={layoutMode === "desktop" ? false : undefined}
          contentSize={layoutMode === "desktop" ? "sm" : "default"}
          items={frozenItems ?? getItems(nativePath)}
          onOpenWillChange={(open) => {
            if (open) setFrozenItems(getItems(nativePath));
          }}
          onOpenChange={(open) => {
            if (!open) setFrozenItems(null);
          }}
          trigger={children}
        />
      </View>
    </FilePathTooltip>
  );
}
