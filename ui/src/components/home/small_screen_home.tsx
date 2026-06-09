import { type Href, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "tamagui";

import { isDesktop, isWeb, os } from "@/api/common";
import { isDebugFeatureEnabled, openDebugPanel } from "@/components/debug";
import { Button, Text } from "@/components/ui";
import { getAppHomeTitle } from "@/config";

const SETTINGS_HREF = "/settings" as Href;

export function SmallScreenHome() {
  const router = useRouter();
  const theme = useTheme();
  const usesNativeHomeHeader = os() === "ios";

  return (
    <SafeAreaView
      edges={usesNativeHomeHeader ? ["left", "right", "bottom"] : ["top"]}
      style={styles.screen}
    >
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior={usesNativeHomeHeader ? "automatic" : "never"}
        style={styles.scrollView}
      >
        <View style={styles.intro}>
          {!usesNativeHomeHeader ? (
            <Text fontSize="$10" fontWeight="600">
              {getAppHomeTitle()}
            </Text>
          ) : null}
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
          {isDebugFeatureEnabled() && !isWeb() && !isDesktop() ? (
            <Button onPress={() => void openDebugPanel()}>打开调试面板</Button>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: 24,
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
