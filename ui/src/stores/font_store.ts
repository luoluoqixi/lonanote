import { systemFonts } from "@/api/commands/fonts";
import type { FontConsumer, FontFamilyEntry } from "@/api/commands/fonts/types";
import { loadFont } from "@/fonts/font_loader";
import { createFontRuntime } from "@/fonts/font_runtime";

export const fontRuntimes = {
  ui: createFontRuntime({
    resolve: (selection) => systemFonts.resolve(selection, "ui"),
    load: (font) => loadFont(font, "ui"),
  }),
  editor: createFontRuntime({
    resolve: (selection) => systemFonts.resolve(selection, "editor"),
    load: (font) => loadFont(font, "editor"),
  }),
};

let directory: Promise<FontFamilyEntry[]> | undefined;
const verified = new Map<string, Promise<boolean>>();

export function listFontFamilies(refresh = false): Promise<FontFamilyEntry[]> {
  if (refresh) {
    directory = undefined;
    verified.clear();
  }
  if (!directory)
    directory = systemFonts.list(refresh).catch((error) => {
      directory = undefined;
      throw error;
    });
  return directory;
}

/** 只探测可见候选；加载失败的字体不会成为可提交选项。 */
export function verifyFontFamily(entry: FontFamilyEntry, consumer: FontConsumer): Promise<boolean> {
  if (!entry[consumer].available) return Promise.resolve(false);
  const key = `${consumer}:${entry.platform}:${entry.familyKey}`;
  let request = verified.get(key);
  if (!request) {
    request = systemFonts
      .resolve(entry, consumer)
      .then((font) => loadFont(font, consumer))
      .then(
        () => true,
        () => false,
      );
    verified.set(key, request);
  }
  return request;
}
