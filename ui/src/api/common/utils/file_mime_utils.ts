import { getFileExtension } from "./file_type_utils";

const MIME_TYPES = new Map<string, string>([
  ["7z", "application/x-7z-compressed"],
  ["apk", "application/vnd.android.package-archive"],
  ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["epub", "application/epub+zip"],
  ["pdf", "application/pdf"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["rar", "application/vnd.rar"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["zip", "application/zip"],
]);

export function getFileMimeType(path: string): string {
  const extension = getFileExtension(path);
  return extension === null
    ? "application/octet-stream"
    : (MIME_TYPES.get(extension) ?? "application/octet-stream");
}
