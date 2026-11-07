import type { FontConsumer, ResolvedFont } from "@/api/commands/fonts/types";

import { fontProbe } from "./font_probe";

export async function loadFont(
  font: ResolvedFont,
  consumer: FontConsumer = "editor",
): Promise<void> {
  if (consumer === "editor") await fontProbe.load(font);
}
