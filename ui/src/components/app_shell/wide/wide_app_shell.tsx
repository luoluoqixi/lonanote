import { type Href, usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SplitLayout, type SplitLayoutHandle, SplitLayoutPriority } from "rn-ui-kit";

import { isDesktop, rnUiKitStorageAdapter } from "@/api/common";
import { WideSettingsDialog } from "@/components/settings";
import { TitleBar } from "@/components/window_chrome";
import { useAppBackgroundColors } from "@/hooks/settings";

import { ActivityBar } from "./activity_bar";
import { AssistPanel } from "./assist_panel";
import { EditorArea } from "./editor_area";
import { SidePanel } from "./side_panel";
import { StatusBar } from "./status_bar";

const DEBUG_HREF = "/debug" as Href;
const LAYOUT_STORAGE_KEY = "lonanote.wideScreenHome.layout";
const DEFAULT_LAYOUT_STATE = {
  sizes: [],
  visible: [true, true, true, false],
};

export function WideAppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const desktop = isDesktop();
  const appBackgroundColors = useAppBackgroundColors();
  const contentLayoutRef = useRef<SplitLayoutHandle | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(DEFAULT_LAYOUT_STATE.visible[1] ?? true);
  const [showAssistSidebar, setShowAssistSidebar] = useState(
    DEFAULT_LAYOUT_STATE.visible[3] ?? false,
  );

  useEffect(() => {
    setIsSettingsOpen(pathname.startsWith("/settings"));
  }, [pathname]);

  return (
    <SafeAreaView style={{ backgroundColor: appBackgroundColors.screen, flex: 1 }} edges={["top"]}>
      {desktop ? <TitleBar /> : null}
      <View style={{ backgroundColor: appBackgroundColors.screen, flex: 1 }}>
        <SplitLayout vertical>
          <SplitLayout.Pane minSize={1} priority={SplitLayoutPriority.High}>
            <SplitLayout
              ref={contentLayoutRef}
              proportionalLayout={false}
              storageFallbackState={DEFAULT_LAYOUT_STATE}
              storageKey={LAYOUT_STORAGE_KEY}
              storageAdapter={rnUiKitStorageAdapter}
              mobileHandlePositions={{ 1: "right", 2: "left" }}
              mobileHandleOffset={-2}
              onStateChange={(state) => {
                const nextShowSidebar = state.visible[1] ?? true;
                const nextShowAssistSidebar = state.visible[3] ?? false;
                setShowSidebar((prev) => (prev === nextShowSidebar ? prev : nextShowSidebar));
                setShowAssistSidebar((prev) =>
                  prev === nextShowAssistSidebar ? prev : nextShowAssistSidebar,
                );
              }}
            >
              <SplitLayout.Pane minSize={48} maxSize={48} visible>
                <ActivityBar
                  showAssistSidebar={showAssistSidebar}
                  showSidebar={showSidebar}
                  onOpenDebug={() => router.push(DEBUG_HREF)}
                  onOpenSettings={() => {
                    setIsSettingsOpen(true);
                  }}
                  onToggleAssistSidebar={() => {
                    contentLayoutRef.current?.setVisible(3, !showAssistSidebar);
                  }}
                  onToggleSidebar={() => {
                    contentLayoutRef.current?.setVisible(1, !showSidebar);
                  }}
                />
              </SplitLayout.Pane>
              <SplitLayout.Pane
                minSize={170}
                preferredSize={240}
                priority={SplitLayoutPriority.Low}
                snap
              >
                <SidePanel />
              </SplitLayout.Pane>
              <SplitLayout.Pane minSize={20} priority={SplitLayoutPriority.High}>
                <EditorArea />
              </SplitLayout.Pane>
              <SplitLayout.Pane
                minSize={170}
                preferredSize={240}
                priority={SplitLayoutPriority.Low}
                snap
              >
                <AssistPanel />
              </SplitLayout.Pane>
            </SplitLayout>
          </SplitLayout.Pane>
          <SplitLayout.Pane minSize={24} maxSize={24}>
            <StatusBar />
          </SplitLayout.Pane>
        </SplitLayout>
      </View>
      <WideSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={(nextIsOpen) => {
          setIsSettingsOpen(nextIsOpen);

          if (!nextIsOpen && pathname.startsWith("/settings")) {
            router.replace("/");
          }
        }}
      />
    </SafeAreaView>
  );
}
