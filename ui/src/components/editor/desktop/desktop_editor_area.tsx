import { FilePlus2, FolderOpen, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertDialog, Button, useUiTheme } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { isDesktop } from "@/api/common/platform";
import {
  documentRegistry,
  editorInputLeaseCoordinator,
  saveCoordinator,
} from "@/components/editor/controllers";
import { EditorToolbar } from "@/components/editor/editor_toolbar";
import { EditorWebView } from "@/components/editor/editor_webview";
import { useEditorSession } from "@/hooks/editor";
import { isDocumentDirty } from "@/stores/editor";

export function DesktopEditorArea() {
  const theme = useUiTheme();
  const {
    activeEditorId,
    closeEditor,
    discardDocumentDraft,
    documentsById,
    editorsById,
    openEditorIds,
    setActiveEditor,
  } = useEditorSession();
  const [closeTargetEditorId, setCloseTargetEditorId] = useState<string | null>(null);
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  const [closeSaveError, setCloseSaveError] = useState<string | null>(null);
  const activeEditor = activeEditorId ? editorsById[activeEditorId] : null;
  const activeDocument = activeEditor ? documentsById[activeEditor.documentId] : null;
  const closeTarget = closeTargetEditorId ? editorsById[closeTargetEditorId] : null;
  const closeTargetDocument = closeTarget ? documentsById[closeTarget.documentId] : null;
  const tabs = useMemo(
    () =>
      openEditorIds.flatMap((editorId) => {
        const editor = editorsById[editorId];
        const document = editor ? documentsById[editor.documentId] : null;
        return editor && document ? [{ editor, document }] : [];
      }),
    [documentsById, editorsById, openEditorIds],
  );
  const canOpenLooseFile = isDesktop();

  const activateEditor = useCallback(
    (editorId: string) => {
      setActiveEditor(editorId);
      void editorInputLeaseCoordinator.requestLease(editorId).catch(() => undefined);
    },
    [setActiveEditor],
  );

  useEffect(() => {
    if (!activeEditor || !activeDocument) return;
    void documentRegistry.ensureDocumentLoaded(activeDocument.documentId).catch(() => undefined);
    void editorInputLeaseCoordinator.requestLease(activeEditor.editorId).catch(() => undefined);
  }, [activeDocument?.documentId, activeEditor?.editorId]);

  const closeImmediately = useCallback(
    (editorId: string) => {
      closeEditor(editorId);
      setCloseTargetEditorId(null);
      setCloseSaveError(null);
    },
    [closeEditor],
  );

  const requestClose = useCallback(
    (editorId: string) => {
      const editor = editorsById[editorId];
      const document = editor ? documentsById[editor.documentId] : null;
      if (!editor || !document) return;
      if (isDocumentDirty(document) && document.attachedEditorIds.length === 1) {
        setCloseSaveError(null);
        setCloseTargetEditorId(editorId);
        return;
      }
      closeImmediately(editorId);
    },
    [closeImmediately, documentsById, editorsById],
  );

  const saveBeforeClose = useCallback(async () => {
    if (!closeTarget || !closeTargetDocument) return;
    setIsSavingBeforeClose(true);
    setCloseSaveError(null);
    try {
      await saveCoordinator.flushDocument(closeTargetDocument.documentId);
      const latestDocument = documentsById[closeTargetDocument.documentId];
      if (!latestDocument || isDocumentDirty(latestDocument)) {
        throw new Error("保存期间出现新的编辑，请再次保存后关闭");
      }
      closeImmediately(closeTarget.editorId);
    } catch (error) {
      setCloseSaveError(error instanceof Error ? error.message : "保存文档失败");
    } finally {
      setIsSavingBeforeClose(false);
    }
  }, [closeImmediately, closeTarget, closeTargetDocument, documentsById]);

  const discardBeforeClose = useCallback(() => {
    if (!closeTarget || !closeTargetDocument) return;
    saveCoordinator.cancelAutoSave(closeTargetDocument.documentId);
    discardDocumentDraft(closeTargetDocument.documentId);
    closeImmediately(closeTarget.editorId);
  }, [closeImmediately, closeTarget, closeTargetDocument, discardDocumentDraft]);

  const openLooseFile = useCallback(async () => {
    try {
      const result = await fs.showSelectDialog({
        type: "openFile",
        title: "打开 Markdown 文件",
        filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx", "txt"] }],
      });
      if (result?.path) {
        documentRegistry.openEditor({ kind: "looseFile", absolutePath: result.path });
      }
    } catch (error) {
      console.warn("[editor] 打开 loose file 失败", error);
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        <View style={styles.tabList}>
          {tabs.map(({ document, editor }) => {
            const active = editor.editorId === activeEditorId;
            const dirty = isDocumentDirty(document);
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={editor.editorId}
                onPress={() => activateEditor(editor.editorId)}
                style={[styles.tab, active ? { backgroundColor: theme.muted } : null]}
              >
                <Text numberOfLines={1} style={[styles.tabLabel, { color: theme.foreground }]}>
                  {document.title}
                </Text>
                {dirty ? (
                  <View style={[styles.dirtyIndicator, { backgroundColor: theme.primary }]} />
                ) : null}
                <Button
                  aria-label={`关闭 ${document.title}`}
                  buttonSize={{ height: 24, width: 24 }}
                  onPress={() => requestClose(editor.editorId)}
                  size="xs"
                  variant="icon"
                >
                  <X color={theme.mutedForeground} size={14} />
                </Button>
              </Pressable>
            );
          })}
        </View>
        <Button
          aria-label="打开文件"
          buttonSize={{ height: 32, width: 32 }}
          disabled={!canOpenLooseFile}
          onPress={() => void openLooseFile()}
          size="xs"
          variant="icon"
        >
          <FolderOpen color={theme.foreground} size={17} />
        </Button>
        <Button
          aria-label="新建文档"
          buttonSize={{ height: 32, width: 32 }}
          onPress={() => documentRegistry.openEditor({ kind: "untitled" })}
          size="xs"
          variant="icon"
        >
          <FilePlus2 color={theme.foreground} size={17} />
        </Button>
      </View>
      {activeEditor && activeDocument ? (
        <View style={styles.editorSurface}>
          {activeDocument.loadState === "ready" ? (
            <EditorWebView document={activeDocument} editor={activeEditor} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={{ color: theme.mutedForeground }}>
                {activeDocument.loadState === "error"
                  ? (activeDocument.loadError ?? "读取文档失败")
                  : "正在打开文档"}
              </Text>
            </View>
          )}
          <EditorToolbar document={activeDocument} editor={activeEditor} />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={{ color: theme.mutedForeground }}>尚未打开文档</Text>
        </View>
      )}
      <AlertDialog
        actionLabel={closeSaveError ? "重试保存" : "保存"}
        actionProps={{ disabled: isSavingBeforeClose, onPress: () => void saveBeforeClose() }}
        cancelLabel="取消"
        cancelProps={{ disabled: isSavingBeforeClose }}
        description={closeSaveError ?? "此文档包含尚未保存的更改。"}
        destructiveLabel="丢弃更改"
        destructiveProps={{ disabled: isSavingBeforeClose, onPress: discardBeforeClose }}
        dismissOnBackPress={!isSavingBeforeClose}
        dismissOnOverlayPress={!isSavingBeforeClose}
        onOpenChange={(open) => {
          if (!open && !isSavingBeforeClose) setCloseTargetEditorId(null);
        }}
        open={closeTargetEditorId !== null}
        title={closeSaveError ? "无法保存文档" : "关闭文档？"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dirtyIndicator: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  editorSurface: {
    flex: 1,
    minHeight: 0,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  tab: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    height: 36,
    maxWidth: 240,
    minWidth: 112,
    paddingLeft: 10,
  },
  tabLabel: {
    flex: 1,
    fontSize: 13,
  },
  tabList: {
    alignItems: "stretch",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    overflow: "hidden",
  },
  tabs: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 37,
    paddingHorizontal: 4,
  },
});
