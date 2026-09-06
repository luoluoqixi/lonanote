import { useNavigation, usePreventRemove } from "@react-navigation/native";
import type { NavigationAction } from "@react-navigation/routers";
import { Redirect, useLocalSearchParams } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { type DropdownItemData, useUiTheme } from "rn-ui-kit";
import { AlertDialog } from "rn-ui-kit/core";

import {
  documentConflictCoordinator,
  documentRegistry,
  editorInputLeaseCoordinator,
  saveCoordinator,
} from "@/components/editor/controllers";
import { useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useEditorDocument, useEditorView } from "@/hooks/editor";
import { useGlobalSettings } from "@/hooks/settings";
import { editorStore, isDocumentDirty } from "@/stores/editor";

import { EditorHeader } from "./editor_header";
import { EditorToolbar } from "./editor_toolbar";
import { EditorWebView } from "./editor_webview";

function getRouteEditorId(editorId: string | string[] | undefined): string | null {
  return Array.isArray(editorId) ? (editorId[0] ?? null) : (editorId ?? null);
}

export function EditorPage() {
  const { editorId: editorIdParam } = useLocalSearchParams<{ editorId?: string | string[] }>();
  const editorId = getRouteEditorId(editorIdParam);
  const view = useEditorView(editorId ?? "");
  const document = useEditorDocument(view?.documentId ?? "");
  const navigation = useNavigation();
  const { settings } = useGlobalSettings();
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [isSavingBeforeClose, setIsSavingBeforeClose] = useState(false);
  const [closeSaveError, setCloseSaveError] = useState<string | null>(null);
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);
  const [dismissedConflictAt, setDismissedConflictAt] = useState<string | null>(null);
  const pendingRemovalActionRef = useRef<NavigationAction | null>(null);
  const allowNextRemovalRef = useRef(false);
  const workspaceRef = document?.ref.kind === "workspaceFile" ? document.ref : null;
  const { isOpening, openInOtherApp } = useOpenInOtherApp({
    filePath: workspaceRef?.filePath,
    workspaceId: workspaceRef?.workspaceId,
  });
  const theme = useUiTheme();
  const accentColor = theme.primary as ComponentProps<typeof ExternalLink>["color"];
  const documentId = document?.documentId ?? null;
  const isDirty = document ? isDocumentDirty(document) : false;
  const conflictDetectedAt = document?.conflict?.detectedAt ?? null;
  const isConflictDialogOpen =
    conflictDetectedAt !== null && dismissedConflictAt !== conflictDetectedAt;
  const shouldFlushBeforeClose =
    settings.editorDefaults.autoSave || settings.editorDefaults.autoSaveOnFocusChange;

  const continueRemoval = useCallback(() => {
    const action = pendingRemovalActionRef.current;
    if (!action) return;
    pendingRemovalActionRef.current = null;
    allowNextRemovalRef.current = true;
    setCloseDialogOpen(false);
    navigation.dispatch(action);
  }, [navigation]);

  const saveBeforeClose = useCallback(async () => {
    if (!documentId) return;
    setIsSavingBeforeClose(true);
    setCloseSaveError(null);
    try {
      await saveCoordinator.flushDocument(documentId);
      const latestDocument = editorStore.getState().documentsById[documentId];
      if (!latestDocument || isDocumentDirty(latestDocument)) {
        throw new Error("保存期间出现新的编辑，请再次保存后离开");
      }
      continueRemoval();
    } catch (error) {
      setCloseSaveError(error instanceof Error ? error.message : "保存文档失败");
      setCloseDialogOpen(true);
    } finally {
      setIsSavingBeforeClose(false);
    }
  }, [continueRemoval, documentId]);

  const discardBeforeClose = useCallback(() => {
    if (!documentId) return;
    saveCoordinator.cancelAutoSave(documentId);
    editorStore.getState().discardDocumentDraft(documentId);
    continueRemoval();
  }, [continueRemoval, documentId]);

  const keepLocalConflict = useCallback(async () => {
    if (!documentId) return;
    setIsResolvingConflict(true);
    try {
      await documentConflictCoordinator.keepLocal(documentId);
      await saveCoordinator.flushDocument(documentId);
    } finally {
      setIsResolvingConflict(false);
    }
  }, [documentId]);

  const loadExternalConflict = useCallback(async () => {
    if (!documentId) return;
    setIsResolvingConflict(true);
    try {
      saveCoordinator.cancelAutoSave(documentId);
      await documentConflictCoordinator.loadExternal(documentId);
    } finally {
      setIsResolvingConflict(false);
    }
  }, [documentId]);

  usePreventRemove(isDirty, ({ data }) => {
    if (allowNextRemovalRef.current) {
      allowNextRemovalRef.current = false;
      return;
    }
    pendingRemovalActionRef.current = data.action;
    if (shouldFlushBeforeClose) {
      void saveBeforeClose();
      return;
    }
    setCloseSaveError(null);
    setCloseDialogOpen(true);
  });

  useEffect(() => {
    if (document) {
      void documentRegistry.ensureDocumentLoaded(document.documentId).catch(() => undefined);
    }
  }, [document?.documentId]);

  useEffect(() => {
    if (!editorId || !view || !document) return;
    editorStore.getState().setActiveEditor(editorId);
    void editorInputLeaseCoordinator.requestLease(editorId).catch(() => undefined);
  }, [document?.documentId, editorId, view?.editorId]);

  const menuItems = useMemo<DropdownItemData[]>(() => {
    if (!workspaceRef) return [];
    return [
      {
        disabled: isOpening,
        icon: <ExternalLink color={accentColor} size={14} />,
        iconProps: { ios: { name: "arrow.up.forward.app" } },
        label: isOpening ? "正在打开…" : "在其他应用中打开",
        onPress: openInOtherApp,
        value: "open-in-other-app",
      },
    ];
  }, [accentColor, isOpening, openInOtherApp, workspaceRef]);

  if (!editorId || !view || !document) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <EditorHeader menuItems={menuItems} title={document.title} />
      <View style={styles.container}>
        {document.loadState === "ready" ? (
          <EditorWebView document={document} editor={view} />
        ) : (
          <View style={styles.statusContainer}>
            {document.loadState === "error" ? (
              <Text style={styles.statusText}>{document.loadError ?? "读取文档失败"}</Text>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        )}
      </View>
      <EditorToolbar document={document} editor={view} />
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
        onOpenChange={setCloseDialogOpen}
        open={closeDialogOpen}
        title={closeSaveError ? "无法保存文档" : "保存更改？"}
      />
      <AlertDialog
        actionLabel="保留本地"
        actionProps={{
          disabled: isResolvingConflict,
          onPress: () => void keepLocalConflict().catch(() => undefined),
        }}
        cancelLabel="稍后处理"
        cancelProps={{ disabled: isResolvingConflict }}
        description="磁盘中的文件已在外部修改。自动保存已暂停。"
        destructiveLabel="加载外部版本"
        destructiveProps={{
          disabled: isResolvingConflict,
          onPress: () => void loadExternalConflict().catch(() => undefined),
        }}
        dismissOnBackPress={!isResolvingConflict}
        dismissOnOverlayPress={!isResolvingConflict}
        onOpenChange={(open) => {
          if (!open && conflictDetectedAt) setDismissedConflictAt(conflictDetectedAt);
        }}
        open={isConflictDialogOpen}
        title="检测到外部修改"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  statusText: {
    color: "#6f7177",
  },
});
