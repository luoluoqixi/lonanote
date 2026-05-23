import { useEffect, useMemo, useRef, useState } from "react";
import { DeviceEventEmitter, Platform, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { Dialog, Tabs } from "@/components/ui";

import { PathDebugPanel } from "./path_debug_panel";
import { UiComponentsDebugPanel } from "./ui_components_panel";
import { WorkspaceDebugPanel } from "./workspace_debug_panel";

type DebugTabKey = "workspace" | "path" | "components";
const DEBUG_PANEL_TOGGLE_EVENT = "lonanote.debug-panel.toggle";

const DEBUG_TABS: Array<{ key: DebugTabKey; label: string }> = [
  { key: "workspace", label: "工作区" },
  { key: "path", label: "路径" },
  { key: "components", label: "组件总览" },
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

function renderDebugTab(tab: DebugTabKey) {
  switch (tab) {
    case "workspace":
      return <WorkspaceDebugPanel />;
    case "path":
      return <PathDebugPanel />;
    case "components":
    default:
      return <UiComponentsDebugPanel />;
  }
}

function DebugTabScrollPane({
  children,
  isActive,
}: {
  children: React.ReactNode;
  isActive: boolean;
}) {
  const scrollViewRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    scrollViewRef.current?.scrollTo({ animated: false, y: 0 });
  }, [isActive]);

  return (
    <View className="flex-1 min-h-0" style={{ display: isActive ? "flex" : "none" }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 12 }}
        ref={scrollViewRef}
        showsVerticalScrollIndicator
        style={{ flex: 1, minHeight: 0 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function DebugPanelHost() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<DebugTabKey>("workspace");
  const [mountedTabs, setMountedTabs] = useState<DebugTabKey[]>(["workspace"]);

  useDebugPanelShortcut(() => {
    setIsOpen((current) => !current);
  });

  useDebugPanelNativeToggle(() => {
    setIsOpen((current) => !current);
  });

  useEffect(() => {
    setMountedTabs((currentTabs) =>
      currentTabs.includes(selectedTab) ? currentTabs : [...currentTabs, selectedTab],
    );
  }, [selectedTab]);

  if (!__DEV__) {
    return null;
  }

  return (
    <Dialog
      contentStyle={{
        height: "98%",
        maxHeight: "98%",
        maxWidth: 1400,
        minHeight: 0,
        width: "94%",
      }}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      title="调试面板"
    >
      <View className="flex-1 min-h-0 flex-row gap-4 overflow-hidden">
        <View
          className="w-44 shrink-0 rounded-2xl border border-foreground/10 bg-background p-2"
          style={{ minHeight: 0 }}
        >
          <View className="mb-3 gap-1 px-2 pt-1">
            <Text className="text-sm text-foreground/65">
              F6 打开或关闭，当前仅在开发模式启用。
            </Text>
          </View>

          <Tabs
            accessibilityLabel="调试面板导航"
            orientation="vertical"
            className="w-full"
            onValueChange={(nextValue) => setSelectedTab(nextValue as DebugTabKey)}
            value={selectedTab}
            items={DEBUG_TABS.map((tab) => ({
              label: tab.label,
              value: tab.key,
            }))}
          />
        </View>

        <View className="flex-1 min-w-0 min-h-0 overflow-hidden rounded-2xl border border-foreground/10 bg-background p-4">
          {mountedTabs.map((tab) => (
            <DebugTabScrollPane key={tab} isActive={tab === selectedTab}>
              {renderDebugTab(tab)}
            </DebugTabScrollPane>
          ))}
        </View>
      </View>
    </Dialog>
  );
}
