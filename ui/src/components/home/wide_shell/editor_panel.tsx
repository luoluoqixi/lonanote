import { Text, View } from "react-native";

export function EditorPanel() {
  return (
    <View className="h-full bg-background">
      <View className="h-10 flex-row items-center justify-center">
        <Text className="text-base text-foreground">编辑区</Text>
      </View>
    </View>
  );
}
