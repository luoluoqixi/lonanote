export type SupportedWorkspaceFileKind = "markdown" | "text" | "image" | "video" | "unsupported";

export const MARKDOWN_FILE_EXTENSIONS = ["md", "markdown"] as const;

export const TEXT_FILE_EXTENSIONS = [
  "c",
  "h",
  "cc",
  "cpp",
  "hpp",
  "mm",
  "cs",
  "css",
  "go",
  "html",
  "java",
  "kt",
  "kts",
  "js",
  "ts",
  "jsx",
  "tsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
  "json",
  "less",
  "php",
  "py",
  "python",
  "rs",
  "sass",
  "scss",
  "sql",
  "vue",
  "xml",
  "plist",
  "storyboard",
  "yaml",
  "yml",
  "txt",
  "bat",
  "cmd",
  "sh",
  "bash",
  "zsh",
  "fish",
  "swift",
  "dart",
  "lua",
  "rb",
  "r",
  "gradle",
  "development",
  "lock",
  "podfile",
  "production",
  "properties",
  "toml",
  "ini",
  "conf",
  "config",
  "env",
  "editorconfig",
  "gitattributes",
  "gitignore",
  "ignore",
  "npmrc",
  "prettierignore",
  "readme",
  "taurignore",
  "csv",
  "tsv",
  "log",
  "diff",
  "patch",
] as const;

export const IMAGE_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "png",
  "gif",
  "webp",
  "svg",
  "apng",
  "bmp",
  "ico",
  "avif",
  "heif",
  "heic",
  "jxl",
  "tga",
] as const;

export const VIDEO_FILE_EXTENSIONS = [
  "mp4",
  "m4v",
  "webm",
  "ogg",
  "ogv",
  "avi",
  "mkv",
  "flv",
  "mov",
  "wmv",
  "3gp",
  "3g2",
  "mpeg",
  "mpg",
] as const;

const TEXT_FILE_NAMES = new Set(["dockerfile", "license", "makefile", "podfile", "readme"]);
const markdownExtensionSet = new Set<string>(MARKDOWN_FILE_EXTENSIONS);
const textExtensionSet = new Set<string>(TEXT_FILE_EXTENSIONS);
const imageExtensionSet = new Set<string>(IMAGE_FILE_EXTENSIONS);
const videoExtensionSet = new Set<string>(VIDEO_FILE_EXTENSIONS);

export function getFileName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function getFileExtension(path: string): string | null {
  const fileName = getFileName(path).toLocaleLowerCase();
  const extensionStart = fileName.lastIndexOf(".");

  if (extensionStart < 0 || extensionStart === fileName.length - 1) {
    return null;
  }

  return fileName.slice(extensionStart + 1);
}

export function isMarkdownFile(path: string): boolean {
  const extension = getFileExtension(path);
  return extension !== null && markdownExtensionSet.has(extension);
}

export function isTextFile(path: string): boolean {
  const fileName = getFileName(path).toLocaleLowerCase();
  const extension = getFileExtension(path);

  return TEXT_FILE_NAMES.has(fileName) || (extension !== null && textExtensionSet.has(extension));
}

export function isImageFile(path: string): boolean {
  const extension = getFileExtension(path);
  return extension !== null && imageExtensionSet.has(extension);
}

export function isVideoFile(path: string): boolean {
  const extension = getFileExtension(path);
  return extension !== null && videoExtensionSet.has(extension);
}

export function detectWorkspaceFileKind(path: string): SupportedWorkspaceFileKind {
  if (isMarkdownFile(path)) {
    return "markdown";
  }
  if (isImageFile(path)) {
    return "image";
  }
  if (isVideoFile(path)) {
    return "video";
  }
  if (isTextFile(path)) {
    return "text";
  }

  return "unsupported";
}
