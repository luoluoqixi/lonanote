import type { TamaguiBuildOptions } from "tamagui";

export default {
  components: ["tamagui", "rn_ui_kit"],
  config: "./tamagui.config.ts",
  outputCSS: "./src/tamagui.generated.css",
} satisfies TamaguiBuildOptions;
