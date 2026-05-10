import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function SmallScreenHome() {
  return (
    <SafeAreaView edges={["top"]}>
      <Text>SmallScreenHome</Text>
    </SafeAreaView>
  );
}
