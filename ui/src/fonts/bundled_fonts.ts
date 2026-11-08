import type { FontConsumer, FontFamilyEntry, ResolvedFont } from "@/api/commands/fonts/types";

export function listBundledFonts(): FontFamilyEntry[] {
  return [
    {
      source: "bundled",
      selection: { source: "bundled", fontId: "fira-code" },
      displayName: "Fira Code",
      ui: { available: true },
      editor: { available: true },
    },
  ];
}
export async function resolveBundledFont(
  fontId: "fira-code",
  _consumer: FontConsumer,
): Promise<ResolvedFont> {
  void _consumer;
  if (fontId !== "fira-code") throw new Error("未知内置字体");
  const family = "LonaBundledFiraCode";
  return {
    family,
    faces: [
      {
        family,
        weight: 400,
        italic: false,
        source: { kind: "bundled", assetId: "fira-code-regular" },
      },
      {
        family,
        weight: 700,
        italic: false,
        source: { kind: "bundled", assetId: "fira-code-bold" },
      },
    ],
  };
}
