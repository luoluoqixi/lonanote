import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TitleBar } from "@/components/titlebar";
import { SplitLayout, SplitLayoutPriority, readSplitLayoutState } from "@/components/ui";

const LAYOUT_STORAGE_KEY = "lonanote.wideScreenHome.layout";

export function WideScreenHome() {
  const initialLayoutState = useMemo(() => readSplitLayoutState(LAYOUT_STORAGE_KEY), []);
  const [showSidebar, setShowSidebar] = useState(() => initialLayoutState?.visible[1] ?? true);
  const [showAssistSidebar, setShowAssistSidebar] = useState(
    () => initialLayoutState?.visible[3] ?? false,
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TitleBar />
      <SplitLayout vertical separator={false}>
        <SplitLayout.Pane minSize={1} priority={SplitLayoutPriority.High}>
          <SplitLayout
            proportionalLayout={false}
            separator={false}
            storageKey={LAYOUT_STORAGE_KEY}
            onVisibleChange={(index, visible) => {
              if (index === 1) setShowSidebar(visible);
              if (index === 3) setShowAssistSidebar(visible);
            }}
          >
            <SplitLayout.Pane minSize={48} maxSize={48} visible>
              <ActivityBar
                showAssistSidebar={showAssistSidebar}
                showSidebar={showSidebar}
                onToggleAssistSidebar={() => setShowAssistSidebar((visible) => !visible)}
                onToggleSidebar={() => setShowSidebar((visible) => !visible)}
              />
            </SplitLayout.Pane>
            <SplitLayout.Pane
              minSize={170}
              preferredSize={300}
              priority={SplitLayoutPriority.Low}
              snap
              visible={showSidebar}
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
              visible={showAssistSidebar}
            >
              <AssistPanel />
            </SplitLayout.Pane>
          </SplitLayout>
        </SplitLayout.Pane>
        <SplitLayout.Pane minSize={24} maxSize={24}>
          <StatusBar />
        </SplitLayout.Pane>
      </SplitLayout>
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
    <View className="h-full w-full items-center border-r border-zinc-200 bg-white py-2 dark:border-zinc-800 dark:bg-zinc-950">
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
      className="mb-1 h-10 w-10 items-center justify-center"
      onPress={onPress}
      style={{ backgroundColor: active ? "rgba(147, 51, 234, 0.12)" : "transparent" }}
    >
      <Text className={active ? "text-xl text-purple-600" : "text-xl text-zinc-500"}>{label}</Text>
    </Pressable>
  );
}

function SidePanel() {
  return (
    <View className="h-full border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <View className="h-9 flex-row items-center px-2">
        <Text className="text-lg text-zinc-950 dark:text-zinc-100">SidePanel</Text>
      </View>
    </View>
  );
}

function EditorPanel() {
  return (
    <View className="h-full bg-white dark:bg-zinc-950">
      <View className="h-10 flex-row items-center justify-center border-b border-zinc-100 dark:border-zinc-900">
        <Text className="text-base text-zinc-950 dark:text-zinc-100">Editor</Text>
      </View>
    </View>
  );
}

function AssistPanel() {
  return (
    <View className="h-full border-l border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">辅助面板</Text>
    </View>
  );
}

function StatusBar() {
  return (
    <View className="h-full flex-row items-center justify-end border-t border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Text className="text-sm text-zinc-600 dark:text-zinc-400">状态栏</Text>
    </View>
  );
}
