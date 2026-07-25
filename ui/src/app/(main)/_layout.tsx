import { DesktopAppShell } from "@/components/app_shell/desktop_app_shell";
import { MobileAppStack } from "@/components/app_shell/mobile_app_stack";
import { useLayoutMode } from "@/hooks/layout";

export const unstable_settings = {
  anchor: "index",
};

export default function MainLayout() {
  const { layoutMode } = useLayoutMode();

  if (layoutMode === "desktop") {
    return <DesktopAppShell />;
  }

  return <MobileAppStack />;
}
