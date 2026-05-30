import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui";

export function StatusBar() {
  return (
    <View style={styles.root}>
      <Text color="$color10" fontSize="$3">
        状态栏
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flexDirection: "row",
    height: "100%",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
  },
});
