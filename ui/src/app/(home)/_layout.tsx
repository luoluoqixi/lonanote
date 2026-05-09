import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";

import { WideScreenHome } from "@/components/home";
import { getAppName, getVersion, initConfig } from "@/config";

const MINIMUM_WIDTH = 728;

export default function UILayout() {
  const { width } = useWindowDimensions();

  useEffect(() => {
    const initialize = async () => {
      await initConfig();
      console.log(`inited, ${getAppName()} - ${getVersion()}.`);
    };
    initialize();
  }, []);

  if (width >= MINIMUM_WIDTH) {
    return <WideScreenHome />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
