import { type Href, useRouter } from "expo-router";
import { useCallback } from "react";

import { openExternalUrl } from "@/api/commands/utils";
import { detectWorkspaceFileKind } from "@/api/common";
import { type EditorResourceActivatedPayload } from "@/assets/editor/src/bridge/protocol";
import {
  parseEditorResourceReference,
  resolveEditorResourceReference,
} from "@/assets/editor/src/resources/resource_reference";
import { documentRegistry, editorCommandCoordinator } from "@/components/editor/controllers";
import { editorWindowService } from "@/components/editor/controllers/editor_window_service";
import { useLayoutMode } from "@/hooks/layout";
import { useMediaNavigation } from "@/hooks/media";
import { type DocumentModel, editorStore } from "@/stores/editor";

const EXTERNAL_ACTION_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function matchesWorkspaceActivation(
  workspaceFilePath: string | null,
  payload: EditorResourceActivatedPayload,
): payload is EditorResourceActivatedPayload & {
  resolved: { kind: "workspaceFile"; path: string; fragment?: string };
} {
  if (!workspaceFilePath || payload.resolved.kind !== "workspaceFile") return false;
  const expected = resolveEditorResourceReference(
    parseEditorResourceReference(payload.rawReference),
    workspaceFilePath,
  );
  return expected.kind === "workspaceFile" && expected.path === payload.resolved.path;
}

function matchesExternalActivation(payload: EditorResourceActivatedPayload): boolean {
  if (payload.resolved.kind !== "external") return false;
  const expected = parseEditorResourceReference(payload.rawReference);
  if (expected.kind !== "external" || expected.url !== payload.resolved.url) return false;
  try {
    return EXTERNAL_ACTION_PROTOCOLS.has(new URL(expected.url).protocol);
  } catch {
    return false;
  }
}

export function useEditorResourceActivation(document: DocumentModel, sourceEditorId?: string) {
  const router = useRouter();
  const { layoutMode } = useLayoutMode();
  const { setMediaSequence } = useMediaNavigation();
  const workspaceId = document.ref.kind === "workspaceFile" ? document.ref.workspaceId : null;
  const workspaceFilePath = document.ref.kind === "workspaceFile" ? document.ref.filePath : null;

  return useCallback(
    (payload: EditorResourceActivatedPayload) => {
      if (matchesWorkspaceActivation(workspaceFilePath, payload)) {
        if (!workspaceId) return;
        const groupId = sourceEditorId
          ? editorStore.getState().editorsById[sourceEditorId]?.groupId
          : undefined;
        if (editorWindowService.isRemote() && sourceEditorId) {
          void editorWindowService
            .openReference(
              sourceEditorId,
              {
                kind: "workspaceFile",
                workspaceId,
                filePath: payload.resolved.path,
              },
              groupId ?? undefined,
              { duplicate: payload.modifiers.newView },
            )
            .then(({ editorId }) => {
              const fragment = payload.resolved.fragment;
              if (!fragment || !editorStore.getState().editorsById[editorId]) return;
              editorStore.getState().setEditorPendingAnchor(editorId, fragment);
              void editorCommandCoordinator
                .execute(editorId, { type: "navigation.scrollToAnchor", fragment })
                .then((result) => {
                  if (result.applied) editorStore.getState().setEditorPendingAnchor(editorId, null);
                })
                .catch(() => undefined);
            })
            .catch((error) => console.warn("打开文档链接失败", error));
          return;
        }
        const fileKind = detectWorkspaceFileKind(payload.resolved.path);
        if (layoutMode === "desktop" && fileKind !== "markdown" && fileKind !== "text") {
          editorStore
            .getState()
            .openViewer(
              { kind: "workspaceFile", workspaceId, filePath: payload.resolved.path },
              fileKind === "image" || fileKind === "video" || fileKind === "pdf"
                ? fileKind
                : "unknown",
              { groupId: groupId ?? undefined },
            );
          return;
        }
        if (fileKind === "image" || fileKind === "video") {
          setMediaSequence({
            mediaPaths: [payload.resolved.path],
            workspaceId,
          });
          router.push({
            pathname: "/media/[kind]",
            params: {
              kind: fileKind,
              mediaIndex: "0",
              path: payload.resolved.path,
              workspaceId,
            },
          } as Href);
          return;
        }
        if (fileKind === "pdf") {
          router.push({
            pathname: "/pdf",
            params: { path: payload.resolved.path, workspaceId },
          } as Href);
          return;
        }
        if (fileKind !== "markdown" && fileKind !== "text") return;
        const { editorId } = documentRegistry.openEditor(
          {
            kind: "workspaceFile",
            workspaceId,
            filePath: payload.resolved.path,
          },
          { duplicate: payload.modifiers.newView, groupId },
        );
        if (payload.resolved.fragment) {
          editorStore.getState().setEditorPendingAnchor(editorId, payload.resolved.fragment);
          void editorCommandCoordinator
            .execute(editorId, {
              type: "navigation.scrollToAnchor",
              fragment: payload.resolved.fragment,
            })
            .then((result) => {
              if (result.applied) {
                editorStore.getState().setEditorPendingAnchor(editorId, null);
              }
            })
            .catch(() => undefined);
        }
        if (layoutMode === "mobile") {
          router.push({ pathname: "/editor/[editorId]", params: { editorId } } as Href);
        }
        return;
      }
      if (matchesExternalActivation(payload) && payload.resolved.kind === "external") {
        void openExternalUrl(payload.resolved.url).catch(() => undefined);
      }
    },
    [layoutMode, router, setMediaSequence, workspaceFilePath, workspaceId, sourceEditorId],
  );
}
