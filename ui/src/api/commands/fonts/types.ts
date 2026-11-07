import type { ResolvedFont } from "@/assets/editor/src/bridge/font_types";

export type FontPlatform = "windows" | "macos" | "linux" | "android" | "ios";
export type FontConsumer = "ui" | "editor";
export type FontSelection = null | {
  platform: FontPlatform;
  familyKey: string;
  displayName: string;
};
export type FontCapability = { available: true } | { available: false; reason: string };
export type FontFamilyEntry = NonNullable<FontSelection> & {
  ui: FontCapability;
  editor: FontCapability;
};
export type { ResolvedFont } from "@/assets/editor/src/bridge/font_types";

export interface SystemFontsApi {
  list(refresh?: boolean): Promise<FontFamilyEntry[]>;
  resolve(selection: NonNullable<FontSelection>, consumer: FontConsumer): Promise<ResolvedFont>;
}
