import { getFileName } from "./file_type_utils";

export function getAvailableEntryName(
  entries: readonly { path: string }[],
  baseName: string,
  extension = "",
): string {
  const names = new Set(entries.map((entry) => getFileName(entry.path).toLocaleLowerCase()));
  let sequence = 1;
  let candidate = `${baseName}${extension}`;

  while (names.has(candidate.toLocaleLowerCase())) {
    sequence += 1;
    candidate = `${baseName} ${sequence}${extension}`;
  }

  return candidate;
}
