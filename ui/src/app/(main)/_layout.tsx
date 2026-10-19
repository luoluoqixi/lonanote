import { type Href, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { detectWorkspaceFileKind } from "@/api/common";
import { DesktopAppShell } from "@/components/app_shell/desktop_app_shell";
import { MobileAppStack } from "@/components/app_shell/mobile_app_stack";
import { useEditorSession } from "@/hooks/editor";
import { useLayoutMode } from "@/hooks/layout";
import { useCurrentWorkspaceId } from "@/hooks/workspace";
import { useWorkspaceStartup } from "@/hooks/workspace";

export const unstable_settings = {
  anchor: "index",
};

export default function MainLayout() {
  const { layoutMode } = useLayoutMode();
  const pathname = usePathname();
  const router = useRouter();
  const params = useGlobalSearchParams<{
    path?: string | string[];
    workspaceId?: string | string[];
  }>();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { openViewer } = useEditorSession();
  const filePath = Array.isArray(params.path) ? params.path[0] : params.path;
  const workspaceId =
    (Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId) ??
    currentWorkspaceId;
  const isFileViewer =
    pathname.startsWith("/media/") || pathname === "/pdf" || pathname === "/unknown";
  useEffect(() => {
    if (layoutMode !== "desktop" || !isFileViewer || !filePath || !workspaceId) return;
    const kind = detectWorkspaceFileKind(filePath);
    openViewer(
      { kind: "workspaceFile", workspaceId, filePath },
      kind === "image" || kind === "video" || kind === "pdf" ? kind : "unknown",
    );
    router.replace("/");
  }, [layoutMode, isFileViewer, filePath, workspaceId, openViewer, router]);
  const { autoOpenedWorkspaceId, isReady } = useWorkspaceStartup();
  const hasAppliedStartupNavigationRef = useRef(false);

  useEffect(() => {
    if (
      !isReady ||
      !autoOpenedWorkspaceId ||
      layoutMode !== "mobile" ||
      pathname !== "/" ||
      hasAppliedStartupNavigationRef.current
    ) {
      return;
    }

    hasAppliedStartupNavigationRef.current = true;
    router.replace("/workspace" as Href);
  }, [autoOpenedWorkspaceId, isReady, layoutMode, pathname, router]);

  if (!isReady) {
    return null;
  }

  if (layoutMode === "desktop") {
    return <DesktopAppShell />;
  }

  return <MobileAppStack />;
}
