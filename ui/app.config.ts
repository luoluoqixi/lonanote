import { type ConfigContext, type ExpoConfig } from "expo/config";

import pkg from "./package.json";

const IS_DEV = process.env.APP_VARIANT === "development";

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return "com.luoluoqixi.lonanote.dev";
  }
  return "com.luoluoqixi.lonanote";
};

const getAppName = () => {
  if (IS_DEV) {
    return "lonanote-dev";
  }
  return "lonanote";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "lonanote",
  version: pkg.version,
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme: "lonanote",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
    // icon: "./assets/expo.icon",
  },
  android: {
    predictiveBackGestureEnabled: false,
    package: getUniqueIdentifier(),
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundImage: "./assets/images/icon.png",
      backgroundColor: "#2d2e30",
    },
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
        backgroundColor: "#2d2e30",
        android: {
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      },
    ],
    "./tools/prebuild/withAndroidNdkVersion.cjs",
    ["./tools/prebuild/withAndroidAdaptiveIconInset.cjs", { inset: "16%" }],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
