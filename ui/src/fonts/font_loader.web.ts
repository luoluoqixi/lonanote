import type { FontConsumer, ResolvedFont } from "@/api/commands/fonts/types";
import { loadFont as loadWebFont } from "@/assets/editor/src/core/font_loading";

export function loadFont(font: ResolvedFont, _consumer?: FontConsumer): Promise<void> {
  void _consumer;
  return loadWebFont(font);
}
