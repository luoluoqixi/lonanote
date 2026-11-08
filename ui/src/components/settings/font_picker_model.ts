import type { FontConsumer, FontFamilyEntry } from "@/api/commands/fonts/types";

export function filterFontFamilies(
  entries: FontFamilyEntry[],
  consumer: FontConsumer,
  query: string,
): FontFamilyEntry[] {
  const search = query.trim().toLocaleLowerCase();
  return entries
    .filter(
      (entry) =>
        entry[consumer].available && entry.displayName.toLocaleLowerCase().includes(search),
    )
    .sort(
      (a, b) =>
        Number(b.source === "bundled") - Number(a.source === "bundled") ||
        a.displayName.localeCompare(b.displayName),
    );
}
