import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";

import { isDesktop } from "@/api/common";
import { WideScreenHome } from "@/components/home";
import { TitleBar } from "@/components/titlebar";
import { getAppName, getVersion, initConfig } from "@/config";

const MINIMUM_WIDTH = 728;

export default function UILayout() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop();

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

  return (
    <>
      {desktop && <TitleBar />}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
