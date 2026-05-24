import { Text, View } from "react-native";

export function StatusBar() {
  return (
    <View className="h-full flex-row items-center justify-end bg-background px-3">
      <Text className="text-sm text-foreground/60">状态栏</Text>
    </View>
  );
}
