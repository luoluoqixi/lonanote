import { usePathname, useRouter } from "expo-router";
import { Folder, LibraryBig, type LucideIcon, Search, Settings } from "lucide-react-native";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Button,
  Dialog,
  SplitLayout,
  type SplitLayoutHandle,
  SplitLayoutPriority,
  Text,
  Tooltip,
  useUiTheme,
} from "rn-ui-kit";

import { isDesktop, rnUiKitStorageAdapter } from "@/api/common";
import { DesktopEditorArea } from "@/components/editor/desktop/desktop_editor_area";
import { DesktopEditorStatusBar } from "@/components/editor/desktop/desktop_editor_status_bar";
import { DesktopSettingsDialog } from "@/components/settings/desktop/settings_dialog";
import { type SettingsPageId, getSettingsPage } from "@/components/settings/settings_config";
import { TitleBar } from "@/components/window/titlebar";
import { WorkspaceExplorerForWorkspace } from "@/components/workspaces/workspace_explorer";
import { WorkspaceSelectContent } from "@/components/workspaces/workspace_select";
import { useWorkbenchDragGuard } from "@/hooks/ui/use_workbench_drag_guard";
import { useCurrentWorkspaceId } from "@/hooks/workspace";
import { useRevealWorkspacePath } from "@/hooks/workspace/use_reveal_workspace_path";

const LAYOUT_STORAGE_KEY = "lonanote.wideScreenHome.layout";
const DEFAULT_LAYOUT_STATE = {
  sizes: [],
  visible: [true, true, true, false],
};

function getSettingsPageId(pathname: string): SettingsPageId {
  const pageId = pathname.split("/")[2];
  const page = getSettingsPage(pageId);
  return page?.desktopTab || page?.parentId ? page.id : "global";
}

export function DesktopAppShell() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();
  const desktop = isDesktop();
  const contentLayoutRef = useRef<SplitLayoutHandle | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(DEFAULT_LAYOUT_STATE.visible[1] ?? true);
  const [panel, setPanel] = useState<"explorer" | "search">("explorer");
  const [selectOpen, setSelectOpen] = useState(false);
  const dragGuard = useWorkbenchDragGuard();
  const theme = useUiTheme();
  const revealPath = useRevealWorkspacePath();
  const revealInExplorer = async (workspaceId: string, path: string) => {
    setPanel("explorer");
    contentLayoutRef.current?.setVisible(1, true);
    await revealPath(workspaceId, path);
  };
  const togglePanel = (next: "explorer" | "search") => {
    contentLayoutRef.current?.setVisible(1, panel === next ? !showSidebar : true);
    setPanel(next);
  };

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
    <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {desktop ? <TitleBar /> : null}
      <View style={[styles.workspace, { backgroundColor: theme.background }]}>
        <SplitLayout vertical>
          <SplitLayout.Pane minSize={1} priority={SplitLayoutPriority.High}>
            <SplitLayout
              ref={contentLayoutRef}
              {...dragGuard}
              mobileHandleOffset={-2}
              mobileHandlePositions={{ 1: "right", 2: "left" }}
              onStateChange={(state) => {
                const nextShowSidebar = state.visible[1] ?? true;

                setShowSidebar((previous) =>
                  previous === nextShowSidebar ? previous : nextShowSidebar,
                );
              }}
              proportionalLayout={false}
              storageAdapter={rnUiKitStorageAdapter}
              storageFallbackState={DEFAULT_LAYOUT_STATE}
              storageKey={LAYOUT_STORAGE_KEY}
            >
              <SplitLayout.Pane maxSize={48} minSize={48} visible>
                <ActivityBar
                  onExplorer={() => togglePanel("explorer")}
                  onSearch={() => togglePanel("search")}
                  onWorkspace={() => setSelectOpen(true)}
                  activePanel={showSidebar ? panel : null}
                  settingsDialog={
                    <DesktopSettingsDialog
                      initialPageId={getSettingsPageId(pathname)}
                      isOpen={isSettingsOpen}
                      onOpenChange={handleSettingsOpenChange}
                      trigger={
                        <ActivityButton
                          accessibilityLabel="设置"
                          active={false}
                          icon={Settings}
                          onPress={() => setIsSettingsOpen(true)}
                        />
                      }
                    />
                  }
                />
              </SplitLayout.Pane>
              <SplitLayout.Pane
                minSize={170}
                preferredSize={240}
                priority={SplitLayoutPriority.Low}
                snap
              >
                <View style={[styles.fullHeight, { backgroundColor: theme.background }]}>
                  {panel === "explorer" ? (
                    <SidePanel onSelectWorkspace={() => setSelectOpen(true)} />
                  ) : (
                    <View style={styles.sidePanelHeader}>
                      <Text style={{ fontSize: 13 }} className="font-semibold">
                        搜索
                      </Text>
                      <Text style={{ fontSize: 12 }} className="text-muted-foreground">
                        搜索工作区中的笔记
                      </Text>
                    </View>
                  )}
                </View>
              </SplitLayout.Pane>
              <SplitLayout.Pane minSize={20} priority={SplitLayoutPriority.High}>
                <DesktopEditorArea onRevealInExplorer={revealInExplorer} />
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
      <Dialog
        open={selectOpen}
        onOpenChange={setSelectOpen}
        title="选择工作区"
        contentProps={{
          style: {
            width: Math.min(720, width * 0.9),
            maxWidth: width * 0.9,
            height: Math.min(600, height * 0.8),
            padding: 16,
            backgroundColor: theme.background,
          },
        }}
        content={
          <View style={{ flex: 1, minHeight: 0 }}>
            <WorkspaceSelectContent embedded onWorkspaceOpened={() => setSelectOpen(false)} />
          </View>
        }
      />
    </SafeAreaView>
  );
}

type ActivityBarProps = {
  onExplorer: () => void;
  onSearch: () => void;
  onWorkspace: () => void;
  activePanel: "explorer" | "search" | null;
  settingsDialog: ReactNode;
};

function ActivityBar({
  onExplorer,
  onSearch,
  onWorkspace,
  activePanel,
  settingsDialog,
}: ActivityBarProps) {
  const theme = useUiTheme();
  return (
    <View
      style={[
        styles.activityBar,
        {
          backgroundColor: theme.background,
          borderRightColor: theme.border,
          borderRightWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <ActivityButton
        accessibilityLabel="资源浏览器"
        active={activePanel === "explorer"}
        icon={Folder}
        onPress={onExplorer}
      />
      <ActivityButton
        accessibilityLabel="搜索"
        active={activePanel === "search"}
        icon={Search}
        onPress={onSearch}
      />
      <View style={styles.spacer} />
      <ActivityButton
        accessibilityLabel="选择工作区"
        active={false}
        icon={LibraryBig}
        onPress={onWorkspace}
      />
      {settingsDialog}
    </View>
  );
}

type ActivityButtonProps = {
  accessibilityLabel: string;
  active: boolean;
  icon: LucideIcon;
  onPress: () => void;
};
function ActivityButton({ accessibilityLabel, active, icon: Icon, onPress }: ActivityButtonProps) {
  const theme = useUiTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip content={accessibilityLabel} contentProps={{ side: "right" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={[
          styles.activityButton,
          {
            backgroundColor: hovered ? theme.muted : "transparent",
            borderLeftWidth: 2,
            borderLeftColor: active ? theme.primary : "transparent",
          },
        ]}
      >
        <Icon
          size={22}
          strokeWidth={1.6}
          color={active || hovered ? theme.foreground : theme.mutedForeground}
        />
      </Pressable>
    </Tooltip>
  );
}

function SidePanel({ onSelectWorkspace }: { onSelectWorkspace: () => void }) {
  const workspaceId = useCurrentWorkspaceId();
  return (
    <View style={[styles.fullHeight, { minHeight: 0, minWidth: 0 }]}>
      {workspaceId ? (
        <WorkspaceExplorerForWorkspace key={workspaceId} workspaceId={workspaceId} mode="tree" />
      ) : (
        <View style={styles.sidePanelHeader}>
          <Text style={{ fontSize: 13 }} className="text-muted-foreground">
            尚未打开工作区
          </Text>
          <Button size="sm" onPress={onSelectWorkspace}>
            选择或创建工作区
          </Button>
        </View>
      )}
    </View>
  );
}

function AssistPanel() {
  return (
    <View style={styles.assistPanel}>
      <Text style={{ fontSize: 13 }} className="font-semibold">
        辅助面板
      </Text>
    </View>
  );
}

function StatusBar() {
  return (
    <View style={styles.statusBar}>
      <DesktopEditorStatusBar />
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
    width: 48,
  },
  assistPanel: {
    height: "100%",
    padding: 12,
  },
  fullHeight: {
    height: "100%",
  },
  safeArea: {
    flex: 1,
  },
  sidePanelHeader: {
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  spacer: {
    flex: 1,
  },
  statusBar: {
    height: "100%",
  },
  workspace: {
    flex: 1,
  },
});
