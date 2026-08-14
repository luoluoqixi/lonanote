import { type Href, usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { DesktopAppShell } from "@/components/app_shell/desktop_app_shell";
import { MobileAppStack } from "@/components/app_shell/mobile_app_stack";
import { useLayoutMode } from "@/hooks/layout";
import { useWorkspaceStartup } from "@/hooks/workspace";

export const unstable_settings = {
  anchor: "index",
};

export default function MainLayout() {
  const { layoutMode } = useLayoutMode();
  const pathname = usePathname();
  const router = useRouter();
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
