import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";

export function SidePanel() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text fontSize="$6" fontWeight="600">
          资源面板
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 36,
    paddingHorizontal: 8,
  },
});
