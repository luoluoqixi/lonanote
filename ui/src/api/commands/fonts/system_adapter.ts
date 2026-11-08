import { systemFontIdentity } from "@/fonts/font_selection";

import type { FontConsumer, FontFamilyEntry, ResolvedFont, SystemFontSelection } from "./types";

export type NativeFontRecord = Omit<SystemFontSelection, "source"> &
  Pick<FontFamilyEntry, "ui" | "editor">;
export type NativeFontsApi = {
  list(refresh: boolean): Promise<NativeFontRecord[]>;
  resolve(
    selection: Omit<SystemFontSelection, "source">,
    consumer: FontConsumer,
  ): Promise<ResolvedFont>;
};

export function systemFontAdapter(native: NativeFontsApi) {
  return {
    async list(refresh = false): Promise<FontFamilyEntry[]> {
      return (await native.list(refresh)).map(({ ui, editor, ...identity }) => ({
        source: "system",
        displayName: identity.displayName,
        selection: { source: "system", ...identity },
        ui,
        editor,
      }));
    },
    resolve: (selection: SystemFontSelection, consumer: FontConsumer) =>
      native.resolve(systemFontIdentity(selection), consumer),
  };
}
