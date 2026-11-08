import type { ResolvedFont } from "@/assets/editor/src/bridge/font_types";

export type FontPlatform = "windows" | "macos" | "linux" | "android" | "ios";
export type FontConsumer = "ui" | "editor";
export type SystemFontSelection = {
  source: "system";
  platform: FontPlatform;
  familyKey: string;
  displayName: string;
};
export type FontSelection = null | SystemFontSelection | { source: "bundled"; fontId: "fira-code" };
export type FontCapability = { available: true } | { available: false; reason: string };
export type FontFamilyEntry = {
  selection: NonNullable<FontSelection>;
  source: "bundled" | "system";
  displayName: string;
  ui: FontCapability;
  editor: FontCapability;
};
export type { ResolvedFont } from "@/assets/editor/src/bridge/font_types";

export interface SystemFontsApi {
  list(refresh?: boolean): Promise<FontFamilyEntry[]>;
  resolve(selection: SystemFontSelection, consumer: FontConsumer): Promise<ResolvedFont>;
}
