import { type Href, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, ScrollView, Text } from "rn-ui-kit";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      iosEmptyViewportScrollEnabled
    >
      <View style={styles.header}>
        <Text color="$color10" fontSize="$4">
          选择一个入口继续。
        </Text>
      </View>
      <Button onPress={() => router.push("/settings" as Href)}>设置</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
  },
  header: {
    gap: 8,
    paddingBottom: 8,
  },
  screen: {
    flex: 1,
  },
});
