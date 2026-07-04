import {
  amber,
  amberDark,
  blue,
  blueDark,
  crimson,
  crimsonDark,
  cyan,
  cyanDark,
  gray,
  grayDark,
  mint,
  mintDark,
  pink,
  pinkDark,
  purple,
  purpleDark,
  yellow,
  yellowDark,
} from "@tamagui/colors";

type ThemeColorScale = Record<string, string>;

type AccentThemeDefinition = {
  accent: string;
  accentForeground: string;
  dark: ThemeColorScale;
  label: string;
  light: ThemeColorScale;
};

export const accentThemeDefinitions = {
  mono: {
    accent: gray.gray9,
    accentForeground: "#ffffff",
    dark: grayDark,
    label: "素色",
    light: gray,
  },
  ocean: {
    accent: blue.blue9,
    accentForeground: "#ffffff",
    dark: blueDark,
    label: "海洋",
    light: blue,
  },
  sakura: {
    accent: pink.pink9,
    accentForeground: "#ffffff",
    dark: pinkDark,
    label: "樱花",
    light: pink,
  },
  lavender: {
    accent: purple.purple9,
    accentForeground: "#ffffff",
    dark: purpleDark,
    label: "薰衣草",
    light: purple,
  },
  sunset: {
    accent: amber.amber9,
    accentForeground: "#2b1700",
    dark: amberDark,
    label: "日落",
    light: amber,
  },
  forest: {
    accent: mint.mint9,
    accentForeground: "#05312c",
    dark: mintDark,
    label: "森林",
    light: mint,
  },
  ruby: {
    accent: crimson.crimson9,
    accentForeground: "#ffffff",
    dark: crimsonDark,
    label: "红宝石",
    light: crimson,
  },
  golden: {
    accent: yellow.yellow9,
    accentForeground: "#3a2a00",
    dark: yellowDark,
    label: "金耀",
    light: yellow,
  },
  aqua: {
    accent: cyan.cyan9,
    accentForeground: "#00313d",
    dark: cyanDark,
    label: "水色",
    light: cyan,
  },
} as const satisfies Record<string, AccentThemeDefinition>;

export type AccentThemeName = keyof typeof accentThemeDefinitions;

export const accentThemeNames = Object.keys(accentThemeDefinitions) as AccentThemeName[];

export const defaultAccentThemeName: AccentThemeName = "ocean";

export function getAccentThemePreset(themeName: AccentThemeName) {
  return {
    ...accentThemeDefinitions[themeName],
    themeName,
  };
}

export function normalizeAccentThemeName(value: unknown): AccentThemeName {
  switch (value) {
    case "blue":
      return "ocean";
    case "emerald":
      return "forest";
    case "orange":
      return "sunset";
    case "rose":
      return "ruby";
    case "success":
      return "forest";
    case "warning":
      return "sunset";
    case "error":
      return "ruby";
    default:
      return typeof value === "string" && value in accentThemeDefinitions
        ? (value as AccentThemeName)
        : defaultAccentThemeName;
  }
}
