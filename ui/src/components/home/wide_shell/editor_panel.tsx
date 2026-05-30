import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";

export function EditorPanel() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text fontSize="$4">编辑区</Text>
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
    height: 40,
    justifyContent: "center",
  },
});
