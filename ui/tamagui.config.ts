import { amber, amberDark, cyan, cyanDark } from "@tamagui/colors";
import { createV5Theme, defaultChildrenThemes, defaultConfig } from "@tamagui/config/v5";
import { animations } from "@tamagui/config/v5-css";
import { animations as animationsReanimated } from "@tamagui/config/v5-reanimated";
import { createTamagui, isWeb } from "tamagui";

const themes = createV5Theme({
  childrenThemes: {
    // include defaults (blue, red, green, yellow, etc.)
    ...defaultChildrenThemes,
    // add new colors
    cyan: { light: cyan, dark: cyanDark },
    amber: { light: amber, dark: amberDark },
  },
});

export const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animations : animationsReanimated,
  themes,
});

export default config;

export type Conf = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
