import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TitleBar } from "@/components/titlebar";

export function WideScreenHome() {
  return (
    <SafeAreaView>
      <TitleBar />
      <Text>Wide Screen Home</Text>
    </SafeAreaView>
  );
}
