import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Label, Slider, TamaguiSlider } from "@/components/ui";

const SETTINGS_HREF = "/settings" as Href;

export function SmallScreenHome() {
  const router = useRouter();

  const [sliderValue, setSliderValue] = useState(56);
  const [tamaguiSliderValue, setTamaguiSliderValue] = useState(56);

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
          <Button onPress={() => router.push("/debug")}>打开debug</Button>
        </View>

        <View>
          <Label>Slider Replica</Label>
          <Slider
            max={100}
            min={0}
            value={[sliderValue]}
            onValueChange={(nextValue) => setSliderValue(nextValue[0] ?? 0)}
          />
        </View>
        <View>
          <Label>Slider Tamagui</Label>
          <TamaguiSlider
            max={100}
            min={0}
            value={[tamaguiSliderValue]}
            onValueChange={(nextValue) => setTamaguiSliderValue(nextValue[0] ?? 0)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
