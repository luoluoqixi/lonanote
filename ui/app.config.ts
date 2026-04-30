import { type ConfigContext, type ExpoConfig } from "expo/config";

import { withDebugSuffix } from "./tools/build_plugins/withDebugSuffix";

export default ({ config }: ConfigContext): ExpoConfig =>
  withDebugSuffix({
    ...config,
    name: "lonanote",
    slug: "lonanote",
    version: "1.1.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "lonanote",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.luoluoqixi.lonanote",
      // icon: "./assets/expo.icon",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      package: "com.luoluoqixi.lonanote",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  });
