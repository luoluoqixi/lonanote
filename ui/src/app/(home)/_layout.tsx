import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";

import { isDesktop } from "@/api/common";
import { WideScreenHome } from "@/components/home";
import { TitleBar } from "@/components/titlebar";
import { WIDE_LAYOUT_MINIMUM_WIDTH, getAppName, getVersion, initConfig } from "@/config";

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

  if (width >= WIDE_LAYOUT_MINIMUM_WIDTH) {
    return <WideScreenHome />;
  }

  return (
    <>
      {desktop && <TitleBar />}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
