import { CompactAppStack, WideAppShell } from "@/components/app_shell";
import { useLayoutMode } from "@/hooks/layout";

export const unstable_settings = {
  anchor: "index",
};

export default function MainLayout() {
  const { layoutMode } = useLayoutMode();

  if (layoutMode === "wide") {
    return <WideAppShell />;
  }

  return <CompactAppStack />;
}
