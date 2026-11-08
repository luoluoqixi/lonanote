import { loadAsync } from "expo-font";
import { requireOptionalNativeModule } from "expo-modules-core";

import type { FontConsumer, ResolvedFont } from "@/api/commands/fonts/types";
import { os } from "@/api/common/platform";

import { resolveBundledFont as descriptor } from "./bundled_fonts";

let registration: Promise<void> | undefined;
export async function resolveBundledFont(
  fontId: "fira-code",
  consumer: FontConsumer,
): Promise<ResolvedFont> {
  const font = await descriptor(fontId, consumer);
  if (consumer === "editor") return font;
  registration ??= (async () => {
    await loadAsync({
      LonaFiraCodeRegular: require("../../assets/fonts/fira_code/FiraCode-Regular.ttf"),
      LonaFiraCodeBold: require("../../assets/fonts/fira_code/FiraCode-Bold.ttf"),
    });
    if (os() === "android") {
      const native = requireOptionalNativeModule<{ registerBundledFamily(): Promise<void> }>(
        "NativeSystemFonts",
      );
      if (!native) throw new Error("请重新构建应用以加载内置字体");
      await native.registerBundledFamily();
    }
  })().catch((error) => {
    registration = undefined;
    throw error;
  });
  await registration;
  return { family: os() === "ios" ? "Fira Code" : font.family, faces: [] };
}
