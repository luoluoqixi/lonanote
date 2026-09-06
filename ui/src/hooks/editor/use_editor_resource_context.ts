import { useEffect, useMemo, useState } from "react";

import { workspaceResource } from "@/api/commands/workspace";
import { isTauri, os } from "@/api/common/platform";
import type { EditorResourceContext } from "@/assets/editor/src/bridge/protocol";
import { createUnavailableEditorResourceContext } from "@/components/editor/bridge";
import type { DocumentModel } from "@/stores/editor";

const TAURI_RESOURCE_ENDPOINT = "lonanote-resource://resource";

type ResourceContextState = {
  workspaceId: string;
  documentPath: string;
  context: Extract<EditorResourceContext, { available: true }>;
};

/** 为支持的原生 WebView 申请 endpoint capability；资源内容始终停留在 Native protocol。 */
export function useEditorResourceContext(document: DocumentModel): {
  context: EditorResourceContext;
  isLoading: boolean;
} {
  const workspaceRef = document.ref.kind === "workspaceFile" ? document.ref : null;
  const currentOs = os();
  const supportsNativeResourceProtocol =
    isTauri() || currentOs === "ios" || currentOs === "android";
  const [state, setState] = useState<ResourceContextState | null>(null);
  const [failedResourceKey, setFailedResourceKey] = useState<string | null>(null);
  const unavailableContext = useMemo(
    () => createUnavailableEditorResourceContext(document),
    [document],
  );
  const matchingState =
    workspaceRef &&
    state?.workspaceId === workspaceRef.workspaceId &&
    state.documentPath === workspaceRef.filePath
      ? state
      : null;
  const resourceKey = workspaceRef ? `${workspaceRef.workspaceId}:${workspaceRef.filePath}` : null;

  useEffect(() => {
    if (!workspaceRef || !supportsNativeResourceProtocol) {
      setState(null);
      return;
    }

    let active = true;
    setState(null);
    setFailedResourceKey(null);
    void workspaceResource
      .acquireScope(workspaceRef.workspaceId)
      .then((scope) => {
        if (!active) return;
        setState({
          workspaceId: workspaceRef.workspaceId,
          documentPath: workspaceRef.filePath,
          context: {
            available: true,
            scopeId: scope.scopeId,
            generation: scope.generation,
            endpoint: `${TAURI_RESOURCE_ENDPOINT}/${scope.scopeId}/${scope.generation}`,
            documentPath: workspaceRef.filePath,
          },
        });
      })
      .catch(() => {
        if (active) setFailedResourceKey(resourceKey);
      });
    return () => {
      active = false;
    };
  }, [supportsNativeResourceProtocol, workspaceRef?.filePath, workspaceRef?.workspaceId]);

  return {
    context: matchingState?.context ?? unavailableContext,
    isLoading: Boolean(
      workspaceRef
        && supportsNativeResourceProtocol
        && !matchingState
        && failedResourceKey !== resourceKey,
    ),
  };
}
