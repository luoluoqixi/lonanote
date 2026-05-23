import { type Href, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui";

const SETTINGS_HREF = "/settings" as Href;

export function SmallScreenHome() {
  const router = useRouter();

  return (
    <SafeAreaView className="bg-background" edges={["top"]} style={{ flex: 1 }}>
      <View className="flex-1 justify-between px-5 py-6">
        <View className="gap-3">
          <Text className="text-3xl font-semibold tracking-tight text-foreground">LonaNote</Text>
          <Text className="text-sm leading-6 text-foreground/70">从这里进入全局设置。</Text>
        </View>

        <View className="gap-3 rounded-3xl border border-foreground/10 bg-accent/5 px-4 py-4">
          <Text className="text-base font-medium text-foreground">全局设置</Text>
          <Text className="text-sm leading-6 text-foreground/65">主题、窗口和编辑器默认值。</Text>
          <Button onPress={() => router.push(SETTINGS_HREF)}>打开全局设置</Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
