import { Stack } from "expo-router";
import { useWindowDimensions } from "react-native";

import { WideScreenHome } from "@/components/home";

const MINIMUM_WIDTH = 728;

export default function UILayout() {
  const { width } = useWindowDimensions();

  if (width >= MINIMUM_WIDTH) {
    return <WideScreenHome />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
