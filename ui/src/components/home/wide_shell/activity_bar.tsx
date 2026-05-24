import { Pressable, Text, View } from "react-native";

export type ActivityBarProps = {
  showAssistSidebar: boolean;
  showSidebar: boolean;
  onOpenSettings: () => void;
  onToggleAssistSidebar: () => void;
  onToggleSidebar: () => void;
};

export function ActivityBar({
  showAssistSidebar,
  showSidebar,
  onOpenSettings,
  onToggleAssistSidebar,
  onToggleSidebar,
}: ActivityBarProps) {
  return (
    <View className="h-full w-full items-center bg-background py-2">
      <ActivityButton active={showSidebar} label="⌘" onPress={onToggleSidebar} />
      <ActivityButton active={false} label="⌕" onPress={() => {}} />
      <View className="flex-1" />
      <ActivityButton active={showAssistSidebar} label="☷" onPress={onToggleAssistSidebar} />
      <ActivityButton active={false} label="⚙" onPress={onOpenSettings} />
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
