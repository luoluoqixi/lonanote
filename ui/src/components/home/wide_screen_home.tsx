import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TitleBar } from "@/components/titlebar";
import { SplitLayout, type SplitLayoutHandle, SplitLayoutPriority } from "@/components/ui";

const LAYOUT_STORAGE_KEY = "lonanote.wideScreenHome.layout";
const DEFAULT_LAYOUT_STATE = {
  sizes: [],
  visible: [true, true, true, false],
};

export function WideScreenHome() {
  const contentLayoutRef = useRef<SplitLayoutHandle | null>(null);
  const [showSidebar, setShowSidebar] = useState(DEFAULT_LAYOUT_STATE.visible[1] ?? true);
  const [showAssistSidebar, setShowAssistSidebar] = useState(
    DEFAULT_LAYOUT_STATE.visible[3] ?? false,
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <TitleBar />
      <View className="border-t border-separator/40" style={{ flex: 1 }}>
        <SplitLayout vertical separator={false}>
          <SplitLayout.Pane minSize={1} priority={SplitLayoutPriority.High}>
            <SplitLayout
              ref={contentLayoutRef}
              proportionalLayout={false}
              separator={false}
              storageFallbackState={DEFAULT_LAYOUT_STATE}
              storageKey={LAYOUT_STORAGE_KEY}
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
                preferredSize={300}
                priority={SplitLayoutPriority.Low}
                snap
              >
                <SidePanel />
              </SplitLayout.Pane>
              <SplitLayout.Pane minSize={300} priority={SplitLayoutPriority.High}>
                <EditorPanel />
              </SplitLayout.Pane>
              <SplitLayout.Pane
                minSize={170}
                preferredSize={300}
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
    </SafeAreaView>
  );
}

type ActivityBarProps = {
  showAssistSidebar: boolean;
  showSidebar: boolean;
  onToggleAssistSidebar: () => void;
  onToggleSidebar: () => void;
};

function ActivityBar({
  showAssistSidebar,
  showSidebar,
  onToggleAssistSidebar,
  onToggleSidebar,
}: ActivityBarProps) {
  return (
    <View className="h-full w-full items-center border-r border-separator/40 bg-background py-2">
      <ActivityButton active={showSidebar} label="⌘" onPress={onToggleSidebar} />
      <ActivityButton active={false} label="⌕" onPress={() => {}} />
      <View className="flex-1" />
      <ActivityButton active={showAssistSidebar} label="☷" onPress={onToggleAssistSidebar} />
      <ActivityButton active={false} label="⚙" onPress={() => {}} />
    </View>
  );
}

type ActivityButtonProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function ActivityButton({ active, label, onPress }: ActivityButtonProps) {
  return (
    <Pressable
      className={
        active
          ? "mb-1 h-10 w-10 items-center justify-center bg-accent/10"
          : "mb-1 h-10 w-10 items-center justify-center bg-transparent"
      }
      onPress={onPress}
    >
      <Text className={active ? "text-xl text-accent" : "text-xl text-foreground/50"}>{label}</Text>
    </Pressable>
  );
}

function SidePanel() {
  return (
    <View className="h-full border-r border-separator/40 bg-background">
      <View className="h-9 flex-row items-center px-2">
        <Text className="text-lg text-foreground">SidePanel</Text>
      </View>
    </View>
  );
}

function EditorPanel() {
  return (
    <View className="h-full bg-background">
      <View className="h-10 flex-row items-center justify-center">
        <Text className="text-base text-foreground">Editor</Text>
      </View>
    </View>
  );
}

function AssistPanel() {
  return (
    <View className="h-full border-l border-separator/40 bg-background p-3">
      <Text className="text-lg font-semibold text-foreground">辅助面板</Text>
    </View>
  );
}

function StatusBar() {
  return (
    <View className="h-full flex-row items-center justify-end border-t border-separator/40 bg-background px-3">
      <Text className="text-sm text-foreground/60">状态栏</Text>
    </View>
  );
}
