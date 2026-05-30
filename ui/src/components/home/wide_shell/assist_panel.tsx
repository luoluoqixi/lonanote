import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";

export function AssistPanel() {
  return (
    <View style={styles.root}>
      <Text fontSize="$6" fontWeight="600">
        辅助面板
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: "100%",
    padding: 12,
  },
});
