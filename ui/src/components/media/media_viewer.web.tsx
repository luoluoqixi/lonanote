import { type Href, Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";

import { workspaceResource } from "@/api/commands/workspace";
import { detectWorkspaceFileKind, getFileName, isTauri } from "@/api/common";
import { appendWorkspaceResourceUrl } from "@/assets/editor/src/resources/resource_url";
import { useMediaNavigation } from "@/hooks/media";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

const TAURI_RESOURCE_ENDPOINT = "lonanote-resource://resource";

const containerStyle: CSSProperties = {
  alignItems: "center",
  background: "#000",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  position: "relative",
  width: "100%",
};

const mediaStyle: CSSProperties = {
  height: "100%",
  maxHeight: "100%",
  maxWidth: "100%",
  objectFit: "contain",
  width: "100%",
};

const navigationStyle: CSSProperties = {
  alignItems: "center",
  color: "#fff",
  display: "flex",
  gap: 12,
  left: 0,
  padding: "12px 18px",
  position: "absolute",
  right: 0,
  top: 0,
};

const navigationButtonStyle: CSSProperties = {
  background: "rgba(0, 0, 0, 0.56)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 4,
  color: "#fff",
  cursor: "pointer",
  fontSize: 18,
  height: 32,
  width: 32,
};

function getFirstParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getMediaPaths(
  fallbackPath: string,
  mediaSequence: { mediaPaths: string[]; workspaceId: string } | null,
  workspaceId: string | null,
): string[] {
  if (
    mediaSequence?.workspaceId === workspaceId &&
    mediaSequence.mediaPaths.includes(fallbackPath)
  ) {
    return mediaSequence.mediaPaths;
  }
  return [fallbackPath];
}

function getInitialMediaIndex(
  rawMediaIndex: string | undefined,
  mediaPaths: string[],
  fallbackPath: string,
): number {
  const requestedIndex = Number.parseInt(rawMediaIndex ?? "", 10);
  if (
    Number.isInteger(requestedIndex) &&
    requestedIndex >= 0 &&
    requestedIndex < mediaPaths.length &&
    mediaPaths[requestedIndex] === fallbackPath
  ) {
    return requestedIndex;
  }
  return Math.max(mediaPaths.indexOf(fallbackPath), 0);
}

/** Tauri media viewer 使用 Resource Gateway，避免把附件内容复制到 RN/JS bridge。 */
export function MediaViewer() {
  const router = useRouter();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { mediaSequence } = useMediaNavigation();
  const {
    mediaIndex: rawMediaIndex,
    path,
    workspaceId: rawWorkspaceId,
  } = useLocalSearchParams<{
    mediaIndex?: string | string[];
    path?: string | string[];
    workspaceId?: string | string[];
  }>();
  const workspaceId = getFirstParamValue(rawWorkspaceId) ?? currentWorkspaceId;
  const fallbackPath = getFirstParamValue(path);
  const mediaPaths = useMemo(
    () => (fallbackPath ? getMediaPaths(fallbackPath, mediaSequence, workspaceId) : []),
    [fallbackPath, mediaSequence, workspaceId],
  );
  const initialMediaIndex = getInitialMediaIndex(
    getFirstParamValue(rawMediaIndex),
    mediaPaths,
    fallbackPath ?? "",
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(initialMediaIndex);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const filePath = mediaPaths[activeMediaIndex];
  const fileKind = filePath ? detectWorkspaceFileKind(filePath) : null;
  const mediaUrl = filePath ? mediaUrls[filePath] : null;

  useEffect(() => {
    setActiveMediaIndex(initialMediaIndex);
  }, [initialMediaIndex]);

  useEffect(() => {
    if (!workspaceId || mediaPaths.length === 0 || !isTauri()) return;
    let disposed = false;
    void workspaceResource
      .acquireScope(workspaceId)
      .then((scope) => {
        const endpoint = `${TAURI_RESOURCE_ENDPOINT}/${scope.scopeId}/${scope.generation}`;
        const nextUrls = Object.fromEntries(
          mediaPaths.map((mediaPath) => {
            const url = appendWorkspaceResourceUrl(endpoint, mediaPath);
            if (!url) throw new Error("媒体路径无效");
            return [mediaPath, url];
          }),
        );
        if (!disposed) setMediaUrls(nextUrls);
      })
      .catch((loadError: unknown) => {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : "媒体加载失败");
        }
      });
    return () => {
      disposed = true;
    };
  }, [mediaPaths, workspaceId]);

  const selectMedia = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= 0 && nextIndex < mediaPaths.length) setActiveMediaIndex(nextIndex);
    },
    [mediaPaths.length],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectMedia(activeMediaIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectMedia(activeMediaIndex + 1);
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [activeMediaIndex, selectMedia]);

  if (!workspaceId || !filePath || (fileKind !== "image" && fileKind !== "video")) {
    return <Redirect href={"/" as Href} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: getFileName(filePath) }} />
      <div style={containerStyle}>
        {!isTauri() ? <span style={{ color: "#fff" }}>当前环境不支持媒体预览</span> : null}
        {isTauri() && error ? <span style={{ color: "#ffb4ab" }}>{error}</span> : null}
        {isTauri() && !error && !mediaUrl ? <span style={{ color: "#fff" }}>正在加载…</span> : null}
        {isTauri() && !error && mediaUrl && fileKind === "image" ? (
          <img alt={getFileName(filePath)} src={mediaUrl} style={mediaStyle} />
        ) : null}
        {isTauri() && !error && mediaUrl && fileKind === "video" ? (
          <video autoPlay controls src={mediaUrl} style={mediaStyle} />
        ) : null}
        <div style={navigationStyle}>
          <button
            aria-label="上一个媒体"
            disabled={activeMediaIndex === 0}
            onClick={() => selectMedia(activeMediaIndex - 1)}
            style={navigationButtonStyle}
            type="button"
          >
            {"<"}
          </button>
          <span>
            {activeMediaIndex + 1} / {mediaPaths.length}
          </span>
          <button
            aria-label="下一个媒体"
            disabled={activeMediaIndex >= mediaPaths.length - 1}
            onClick={() => selectMedia(activeMediaIndex + 1)}
            style={navigationButtonStyle}
            type="button"
          >
            {">"}
          </button>
          <button
            aria-label="返回"
            onClick={() => router.back()}
            style={navigationButtonStyle}
            type="button"
          >
            x
          </button>
        </div>
      </div>
    </>
  );
}
