import { useEffect, useMemo, useState } from "react";
import { DeviceEventEmitter, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { Dialog, Tabs } from "@/components/ui";

import { PathDebugPanel } from "./path_debug_panel";
import { UiComponentsDebugPanel } from "./ui_components_panel";
import { WorkspaceDebugPanel } from "./workspace_debug_panel";

type DebugTabKey = "workspace" | "path" | "components";
const DEBUG_PANEL_TOGGLE_EVENT = "lonanote.debug-panel.toggle";

const DEBUG_TABS: Array<{ content: React.ReactNode; key: DebugTabKey; label: string }> = [
  { content: <WorkspaceDebugPanel />, key: "workspace", label: "工作区" },
  { content: <PathDebugPanel />, key: "path", label: "路径" },
  { content: <UiComponentsDebugPanel />, key: "components", label: "组件总览" },
];

function emitDebugPanelToggle() {
  DeviceEventEmitter.emit(DEBUG_PANEL_TOGGLE_EVENT);
}

function useDebugPanelShortcut(onToggle: () => void) {
  useEffect(() => {
    if (!__DEV__ || Platform.OS !== "web") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F6") {
        return;
      }

      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onToggle]);
}

function useDebugPanelNativeToggle(onToggle: () => void) {
  useEffect(() => {
    if (!__DEV__ || Platform.OS === "web") {
      return;
    }

    const subscription = DeviceEventEmitter.addListener(DEBUG_PANEL_TOGGLE_EVENT, onToggle);
    return () => {
      subscription.remove();
    };
  }, [onToggle]);
}

export function DebugPanelGestureLayer({ children }: { children: React.ReactNode }) {
  const gesture = useMemo(() => {
    if (!__DEV__ || Platform.OS === "web") {
      return null;
    }

    return Gesture.Pan()
      .minPointers(3)
      .onEnd((event) => {
        "worklet";

        if (event.translationY < 72 || Math.abs(event.translationX) > 48) {
          return;
        }

        runOnJS(emitDebugPanelToggle)();
      });
  }, []);

  if (!gesture) {
    return children;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}

function DebugTabScrollPane({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.scrollPane}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        style={styles.scrollView}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function DebugPanelHost() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<DebugTabKey>("workspace");

  useDebugPanelShortcut(() => {
    setIsOpen((current) => !current);
  });

  useDebugPanelNativeToggle(() => {
    setIsOpen((current) => !current);
  });

  if (!__DEV__) {
    return null;
  }

  return (
    <Dialog
      width="80%"
      height="88%"
      minWidth={0}
      minHeight={0}
      onOpenChange={setIsOpen}
      open={isOpen}
      title="调试面板"
    >
      <Tabs
        aria-label="调试面板导航"
        contentProps={{ style: styles.tabContent }}
        items={DEBUG_TABS.map((tab) => ({
          content: <DebugTabScrollPane>{tab.content}</DebugTabScrollPane>,
          label: tab.label,
          value: tab.key,
        }))}
        listProps={{ style: styles.tabList }}
        onValueChange={(nextValue) => setSelectedTab(nextValue as DebugTabKey)}
        orientation="vertical"
        style={styles.tabs}
        value={selectedTab}
      />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 12,
  },
  scrollPane: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
  tabContent: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  tabList: {
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 4,
    width: 176,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
  },
});
