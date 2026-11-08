import { systemFonts } from "@/api/commands/fonts";
import type { FontConsumer, FontFamilyEntry, FontSelection } from "@/api/commands/fonts/types";
import { listBundledFonts } from "@/fonts/bundled_fonts";
import { loadFont } from "@/fonts/font_loader";
import { createFontRuntime } from "@/fonts/font_runtime";
import { fontSelectionKey } from "@/fonts/font_selection";
import { resolveBundledFont } from "@/fonts/resolve_bundled_font";

function resolve(selection: NonNullable<FontSelection>, consumer: FontConsumer) {
  return selection.source === "bundled"
    ? resolveBundledFont(selection.fontId, consumer)
    : systemFonts.resolve(selection, consumer);
}
export const fontRuntimes = {
  ui: createFontRuntime({
    resolve: (selection) => resolve(selection, "ui"),
    load: (font) => loadFont(font, "ui"),
  }),
  editor: createFontRuntime({
    resolve: (selection) => resolve(selection, "editor"),
    load: (font) => loadFont(font, "editor"),
  }),
};

let directory: Promise<FontFamilyEntry[]> | undefined;
let directoryError: string | null = null;
export const getFontDirectoryError = () => directoryError;
const verified = new Map<string, Promise<boolean>>();

export function listFontFamilies(refresh = false): Promise<FontFamilyEntry[]> {
  if (refresh) {
    directory = undefined;
    verified.clear();
  }
  if (!directory)
    directory = systemFonts.list(refresh).then(
      (entries) => {
        directoryError = null;
        return [...listBundledFonts(), ...entries];
      },
      (error) => {
        directoryError = String(error);
        return listBundledFonts();
      },
    );
  return directory;
}

/** 只探测可见候选；加载失败的字体不会成为可提交选项。 */
export function verifyFontFamily(entry: FontFamilyEntry, consumer: FontConsumer): Promise<boolean> {
  if (!entry[consumer].available) return Promise.resolve(false);
  const key = `${consumer}:${fontSelectionKey(entry.selection)}`;
  let request = verified.get(key);
  if (!request) {
    request = resolve(entry.selection, consumer)
      .then((font) => loadFont(font, consumer))
      .then(
        () => true,
        () => false,
      );
    verified.set(key, request);
  }
  return request;
}
