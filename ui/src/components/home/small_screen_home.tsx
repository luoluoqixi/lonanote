import { type Href, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "tamagui";

import { Button, Text } from "@/components/ui";

const SETTINGS_HREF = "/settings" as Href;

export function SmallScreenHome() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.background.val }]}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <Text fontSize="$10" fontWeight="600">
            LonaNote
          </Text>
          <Text color="$color10" fontSize="$3" lineHeight="$4">
            从这里进入全局设置。
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.color2.val,
              borderColor: theme.borderColor.val,
            },
          ]}
        >
          <Text fontSize="$5" fontWeight="500">
            全局设置
          </Text>
          <Text color="$color10" fontSize="$3" lineHeight="$4">
            主题、窗口和编辑器默认值。
          </Text>
          <Button onPress={() => router.push(SETTINGS_HREF)}>打开全局设置</Button>
          <Button onPress={() => router.push("/debug")}>打开debug</Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  intro: {
    gap: 12,
  },
  card: {
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
});
