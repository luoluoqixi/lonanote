import { type Href, usePathname, useRouter } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SplitLayout,
  type SplitLayoutHandle,
  SplitLayoutPriority,
  Text,
  useTheme,
} from "rn-ui-kit";

import { isDesktop, rnUiKitStorageAdapter } from "@/api/common";
import { DesktopSettingsDialog } from "@/components/settings/desktop/settings_dialog";
import { type SettingsPageId, getSettingsPage } from "@/components/settings/settings_config";
import { TitleBar } from "@/components/window/titlebar";
import { useAppBackgroundColors } from "@/hooks/settings";

const DEBUG_HREF = "/debug" as Href;
const LAYOUT_STORAGE_KEY = "lonanote.wideScreenHome.layout";
const DEFAULT_LAYOUT_STATE = {
  sizes: [],
  visible: [true, true, true, false],
};

function getSettingsPageId(pathname: string): SettingsPageId {
  const pageId = pathname.split("/")[2];
  const page = getSettingsPage(pageId);
  return page?.desktopTab ? page.id : "global";
}

export function DesktopAppShell() {
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

  const handleSettingsOpenChange = (nextIsOpen: boolean) => {
    setIsSettingsOpen(nextIsOpen);

    if (!nextIsOpen && pathname.startsWith("/settings")) {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.safeArea, { backgroundColor: appBackgroundColors.screen }]}
    >
      {desktop ? <TitleBar /> : null}
      <View style={[styles.workspace, { backgroundColor: appBackgroundColors.screen }]}>
        <SplitLayout vertical>
          <SplitLayout.Pane minSize={1} priority={SplitLayoutPriority.High}>
            <SplitLayout
              ref={contentLayoutRef}
              mobileHandleOffset={-2}
              mobileHandlePositions={{ 1: "right", 2: "left" }}
              onStateChange={(state) => {
                const nextShowSidebar = state.visible[1] ?? true;
                const nextShowAssistSidebar = state.visible[3] ?? false;

                setShowSidebar((previous) =>
                  previous === nextShowSidebar ? previous : nextShowSidebar,
                );
                setShowAssistSidebar((previous) =>
                  previous === nextShowAssistSidebar ? previous : nextShowAssistSidebar,
                );
              }}
              proportionalLayout={false}
              storageAdapter={rnUiKitStorageAdapter}
              storageFallbackState={DEFAULT_LAYOUT_STATE}
              storageKey={LAYOUT_STORAGE_KEY}
            >
              <SplitLayout.Pane maxSize={48} minSize={48} visible>
                <ActivityBar
                  onOpenDebug={() => router.push(DEBUG_HREF)}
                  onToggleAssistSidebar={() => {
                    contentLayoutRef.current?.setVisible(3, !showAssistSidebar);
                  }}
                  onToggleSidebar={() => {
                    contentLayoutRef.current?.setVisible(1, !showSidebar);
                  }}
                  settingsDialog={
                    <DesktopSettingsDialog
                      initialPageId={getSettingsPageId(pathname)}
                      isOpen={isSettingsOpen}
                      onOpenChange={handleSettingsOpenChange}
                      trigger={
                        <ActivityButton
                          accessibilityLabel="设置"
                          active={false}
                          label="⚙"
                          onPress={() => setIsSettingsOpen(true)}
                        />
                      }
                    />
                  }
                  showAssistSidebar={showAssistSidebar}
                  showSidebar={showSidebar}
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
          <SplitLayout.Pane maxSize={24} minSize={24}>
            <StatusBar />
          </SplitLayout.Pane>
        </SplitLayout>
      </View>
    </SafeAreaView>
  );
}

type ActivityBarProps = {
  onOpenDebug: () => void;
  onToggleAssistSidebar: () => void;
  onToggleSidebar: () => void;
  settingsDialog: ReactNode;
  showAssistSidebar: boolean;
  showSidebar: boolean;
};

function ActivityBar({
  onOpenDebug,
  onToggleAssistSidebar,
  onToggleSidebar,
  settingsDialog,
  showAssistSidebar,
  showSidebar,
}: ActivityBarProps) {
  return (
    <View style={styles.activityBar}>
      <ActivityButton
        accessibilityLabel="切换资源面板"
        active={showSidebar}
        label="⌘"
        onPress={onToggleSidebar}
      />
      <ActivityButton accessibilityLabel="调试" active={false} label="⚒" onPress={onOpenDebug} />
      <ActivityButton accessibilityLabel="搜索" active={false} label="⌕" onPress={() => {}} />
      <View style={styles.spacer} />
      <ActivityButton
        accessibilityLabel="切换辅助面板"
        active={showAssistSidebar}
        label="☷"
        onPress={onToggleAssistSidebar}
      />
      {settingsDialog}
    </View>
  );
}

type ActivityButtonProps = {
  accessibilityLabel: string;
  active: boolean;
  label: string;
  onPress: () => void;
};

function ActivityButton({ accessibilityLabel, active, label, onPress }: ActivityButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.activityButton, active ? { backgroundColor: theme.color3.val } : null]}
    >
      <Text color={active ? "$color" : "$color10"} fontSize="$8">
        {label}
      </Text>
    </Pressable>
  );
}

function SidePanel() {
  return (
    <View style={styles.fullHeight}>
      <View style={styles.sidePanelHeader}>
        <Text fontSize="$6" fontWeight="600">
          资源面板
        </Text>
      </View>
    </View>
  );
}

function EditorArea() {
  return (
    <View style={styles.fullHeight}>
      <View style={styles.editorHeader}>
        <Text fontSize="$4">编辑区</Text>
      </View>
    </View>
  );
}

function AssistPanel() {
  return (
    <View style={styles.assistPanel}>
      <Text fontSize="$6" fontWeight="600">
        辅助面板
      </Text>
    </View>
  );
}

function StatusBar() {
  return (
    <View style={styles.statusBar}>
      <Text color="$color10" fontSize="$3">
        状态栏
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  activityBar: {
    alignItems: "center",
    height: "100%",
    paddingVertical: 8,
    width: "100%",
  },
  activityButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginBottom: 4,
    width: 40,
  },
  assistPanel: {
    height: "100%",
    padding: 12,
  },
  editorHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
  },
  fullHeight: {
    height: "100%",
  },
  safeArea: {
    flex: 1,
  },
  sidePanelHeader: {
    alignItems: "center",
    flexDirection: "row",
    height: 36,
    paddingHorizontal: 8,
  },
  spacer: {
    flex: 1,
  },
  statusBar: {
    alignItems: "center",
    flexDirection: "row",
    height: "100%",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
  },
  workspace: {
    flex: 1,
  },
});
