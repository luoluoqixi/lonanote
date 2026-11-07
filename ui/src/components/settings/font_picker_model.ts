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
        entry[consumer].available &&
        `${entry.displayName} ${entry.familyKey}`.toLocaleLowerCase().includes(search),
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
