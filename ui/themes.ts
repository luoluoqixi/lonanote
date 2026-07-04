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
  green,
  greenDark,
  mint,
  mintDark,
  pink,
  pinkDark,
  purple,
  purpleDark,
  red,
  redDark,
  yellow,
  yellowDark,
} from "@tamagui/colors";
import { createV5Theme, defaultChildrenThemes } from "@tamagui/config/v5";
import { v5ComponentThemes } from "@tamagui/themes/v5";

const darkPalette = [
  "#0B0D10",
  "#121418",
  "#171A1F",
  "#1E2228",
  "#252A31",
  "#2D333B",
  "#373E47",
  "#4A5562",
  "#66707F",
  "#8B97A8",
  "#E8EBEF",
  "#FFFFFF",
];

const lightPalette = [
  "#FCFCFD",
  "#F8F9FA",
  "#F3F4F6",
  "#EDEEF1",
  "#E5E7EB",
  "#D6D9DE",
  "#C4C8CF",
  "#AEB4BE",
  "#9098A5",
  "#68707D",
  "#20242A",
  "#111317",
];

const builtThemes = createV5Theme({
  darkPalette,
  lightPalette,
  componentThemes: v5ComponentThemes,

  accent: {
    light: blue,
    dark: blueDark,
  },

  childrenThemes: {
    ...defaultChildrenThemes,

    mono: {
      light: gray,
      dark: grayDark,
    },

    ocean: {
      light: blue,
      dark: blueDark,
    },

    sakura: {
      light: pink,
      dark: pinkDark,
    },

    lavender: {
      light: purple,
      dark: purpleDark,
    },

    sunset: {
      light: amber,
      dark: amberDark,
    },

    forest: {
      light: mint,
      dark: mintDark,
    },

    ruby: {
      light: crimson,
      dark: crimsonDark,
    },

    golden: {
      light: yellow,
      dark: yellowDark,
    },

    aqua: {
      light: cyan,
      dark: cyanDark,
    },

    success: {
      light: green,
      dark: greenDark,
    },

    warning: {
      light: amber,
      dark: amberDark,
    },

    error: {
      light: red,
      dark: redDark,
    },
  },
});

export type Themes = typeof builtThemes;

export const themes: Themes =
  process.env.TAMAGUI_ENVIRONMENT === "client" && process.env.NODE_ENV === "production"
    ? ({} as any)
    : (builtThemes as any);
