import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import {
  nativeStackStatusBarOptions,
  withNativeBackButton,
  withNativeStackGestureOptions,
} from "rn-ui-kit";
import { useTheme } from "rn-ui-kit";

import { isDesktop, os } from "@/api/common";
import { WideScreenHome } from "@/components/home";
import { getSettingsMobileHeaderTitle } from "@/components/settings";
import { TitleBar } from "@/components/titlebar";
import {
  WIDE_LAYOUT_MINIMUM_WIDTH,
  getAppHomeTitle,
  getAppName,
  getVersion,
  initConfig,
} from "@/config";
import { useAppBackgroundColors, useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  anchor: "index",
};

export default function UILayout() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();
  const appBackgroundColors = useAppBackgroundColors();
  const theme = useTheme();

  useEffect(() => {
    const initialize = async () => {
      await initConfig();
      console.log(`inited, ${getAppName()} - ${getVersion()}, ${os()}.`);
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
        screenOptions={({ navigation, route }) => {
          const stackBackgroundColor = appBackgroundColors.screen;
          const headerBackgroundColor = appBackgroundColors.header;
          const headerTitleColor = theme.gray12.val;
          const baseScreenOptions = {
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerTintColor: theme.color10.val,
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerTitleStyle: {
              color: headerTitleColor,
            },
          } as const;

          if (route.name === "index" && os() === "ios") {
            return withNativeStackGestureOptions({
              contentStyle: baseScreenOptions.contentStyle,
              headerTintColor: theme.color10.val,
              headerShadowVisible: false,
              headerLargeStyle: {
                backgroundColor: stackBackgroundColor,
              },
              headerStyle: {
                backgroundColor: stackBackgroundColor,
              },
              headerShown: true,
              headerLargeTitle: true,
              headerLargeTitleStyle: {
                color: headerTitleColor,
              },
              headerLargeTitleShadowVisible: false,
              headerTitleStyle: {
                color: headerTitleColor,
              },
              headerTransparent: true,
              title: getAppHomeTitle(),
            });
          }

          if (route.name.startsWith("settings/")) {
            const settingsTitle = getSettingsMobileHeaderTitle(route.name);
            const settingsScreenOptions = withNativeStackGestureOptions({
              ...baseScreenOptions,
              ...(os() === "ios"
                ? {
                    headerLargeStyle: {
                      backgroundColor: headerBackgroundColor,
                    },
                    headerLargeTitleShadowVisible: false,
                    headerShadowVisible: false,
                    headerStyle: {
                      backgroundColor: headerBackgroundColor,
                    },
                  }
                : {}),
              headerShown: settingsTitle != null,
              title: settingsTitle ?? "设置",
            });

            return withNativeBackButton(
              {
                ...settingsScreenOptions,
                ...(os() === "ios"
                  ? {
                      fullScreenGestureEnabled: false,
                      fullScreenGestureShadowEnabled: false,
                    }
                  : {}),
              },
              {
                label: getAppHomeTitle(),
                onPress: () => navigation.goBack(),
              },
            );
          }

          return withNativeStackGestureOptions({
            ...baseScreenOptions,
            headerShown: false,
          });
        }}
      >
        <Stack.Screen name="index" options={{ title: getAppHomeTitle() }} />
      </Stack>
    </>
  );
}
