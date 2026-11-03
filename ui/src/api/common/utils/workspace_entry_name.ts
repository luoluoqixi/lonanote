import { getFileName } from "./file_type_utils";

export function getWorkspaceEntryCreateParent(
  entry?: { path: string; fileType: string },
  fallbackPath = "",
): string {
  if (!entry) return fallbackPath;
  return entry.fileType === "directory" ? entry.path : entry.path.split("/").slice(0, -1).join("/");
}

export function getDefaultWorkspaceEntryName(
  entries: readonly { path: string }[],
  kind: "note" | "directory",
): string {
  return kind === "note"
    ? getAvailableEntryName(entries, "未命名笔记", ".md")
    : getAvailableEntryName(entries, "新建文件夹");
}

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
