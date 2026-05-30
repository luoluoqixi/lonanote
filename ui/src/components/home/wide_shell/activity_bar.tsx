import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "tamagui";

import { Text } from "@/components/ui";

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
    <View style={styles.root}>
      <ActivityButton active={showSidebar} label="⌘" onPress={onToggleSidebar} />
      <ActivityButton active={false} label="⌕" onPress={() => {}} />
      <View style={styles.spacer} />
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
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.button,
        active ? { backgroundColor: theme.color3.val } : null,
      ]}
    >
      <Text color={active ? "$color" : "$color10"} fontSize="$8">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    height: "100%",
    paddingVertical: 8,
    width: "100%",
  },
  spacer: {
    flex: 1,
  },
  button: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    marginBottom: 4,
    width: 40,
  },
});
