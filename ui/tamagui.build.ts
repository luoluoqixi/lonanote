import type { TamaguiBuildOptions } from "tamagui";

export default {
  components: ["tamagui"],
  config: "./tamagui.config.ts",
  outputCSS: "./src/tamagui.generated.css",
} satisfies TamaguiBuildOptions;
