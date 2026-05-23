import { Text, View } from "react-native";

export function SidePanel() {
  return (
    <View className="h-full border-r border-separator/40 bg-background">
      <View className="h-9 flex-row items-center px-2">
        <Text className="text-lg text-foreground">资源面板</Text>
      </View>
    </View>
  );
}
