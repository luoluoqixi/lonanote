import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";

import { isDesktop } from "@/api/common";
import { nativeStackStatusBarOptions, sheetScreenOptions, sheetStackScreen } from "@/components/ui";
import { WideScreenHome } from "@/components/home";
import { TitleBar } from "@/components/titlebar";
import { WIDE_LAYOUT_MINIMUM_WIDTH, getAppName, getVersion, initConfig } from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  anchor: "index",
};

export default function UILayout() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();

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
      <Stack
        screenOptions={({ route }) => {
          if (route.name === "debug") {
            return sheetScreenOptions("card", { headerShown: false });
          }

          return {
            ...nativeStackStatusBarOptions(colorScheme),
            headerShown: false,
          };
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          {...sheetStackScreen("card", { name: "debug", options: { headerShown: false } })}
        />
      </Stack>
    </>
  );
}
