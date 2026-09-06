export type EditorResourceReference =
  | { kind: "anchor"; fragment: string }
  | {
      kind: "documentRelative";
      rawPath: string;
      query: string | null;
      fragment: string | null;
    }
  | {
      kind: "workspaceRootRelative";
      rawPath: string;
      query: string | null;
      fragment: string | null;
    }
  | { kind: "external"; url: string }
  | { kind: "unsupported"; raw: string; reason: string };

export type EditorResolvedResourceReference =
  | { kind: "anchor"; fragment: string }
  | {
      kind: "workspaceFile";
      path: string;
      query: string | null;
      fragment: string | null;
    }
  | { kind: "external"; url: string }
  | { kind: "unsupported"; raw: string; reason: string };

export type EditorResourceReferenceOptions = {
  isSurfaceBlobUrl?: (url: string) => boolean;
};

type SplitReference = {
  path: string;
  query: string | null;
  fragment: string | null;
};

const SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
const ENCODED_SEPARATOR_PATTERN = /%2f|%5c/i;
const ENCODED_PERCENT_PATTERN = /%[0-9A-Fa-f]{2}/;

function unsupported(raw: string, reason: string): EditorResourceReference {
  return { kind: "unsupported", raw, reason };
}

function containsControlCharacter(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function splitReference(raw: string): SplitReference {
  const hashIndex = raw.indexOf("#");
  const beforeFragment = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? null : raw.slice(hashIndex + 1);
  const queryIndex = beforeFragment.indexOf("?");
  return {
    path: queryIndex === -1 ? beforeFragment : beforeFragment.slice(0, queryIndex),
    query: queryIndex === -1 ? null : beforeFragment.slice(queryIndex + 1),
    fragment,
  };
}

function decodeOnce(value: string): { ok: true; value: string } | { ok: false; reason: string } {
  try {
    const decoded = decodeURIComponent(value);
    if (ENCODED_PERCENT_PATTERN.test(decoded)) {
      return { ok: false, reason: "不允许可能改变语义的二次 URL decode" };
    }
    return { ok: true, value: decoded };
  } catch {
    return { ok: false, reason: "URL percent encoding 无效" };
  }
}

function validateResourcePath(
  rawPath: string,
): { ok: true; path: string } | { ok: false; reason: string } {
  if (!rawPath) return { ok: false, reason: "资源路径不能为空" };
  if (containsControlCharacter(rawPath)) return { ok: false, reason: "资源路径不能包含控制字符" };
  if (rawPath.includes("\\")) return { ok: false, reason: "资源路径不能包含反斜杠" };
  if (ENCODED_SEPARATOR_PATTERN.test(rawPath)) {
    return { ok: false, reason: "资源路径不能包含编码分隔符" };
  }

  const decoded = decodeOnce(rawPath);
  if (!decoded.ok) return decoded;
  if (containsControlCharacter(decoded.value)) {
    return { ok: false, reason: "资源路径不能包含控制字符" };
  }
  if (decoded.value.includes("\\")) {
    return { ok: false, reason: "资源路径不能包含反斜杠" };
  }
  if (decoded.value.split("/").some((segment) => segment.length === 0)) {
    return { ok: false, reason: "资源路径不能包含空 segment" };
  }
  return { ok: true, path: decoded.value };
}

function decodeFragment(raw: string): string | null {
  if (containsControlCharacter(raw)) return null;
  const decoded = decodeOnce(raw);
  return decoded.ok && !containsControlCharacter(decoded.value) ? decoded.value : null;
}

export function parseEditorResourceReference(
  raw: string,
  options: EditorResourceReferenceOptions = {},
): EditorResourceReference {
  if (containsControlCharacter(raw)) return unsupported(raw, "资源引用不能包含控制字符");
  if (!raw) return unsupported(raw, "资源引用不能为空");

  const split = splitReference(raw);
  if (!split.path) {
    if (split.fragment === null) return unsupported(raw, "资源引用不能为空");
    const fragment = decodeFragment(split.fragment);
    return fragment === null
      ? unsupported(raw, "anchor fragment 无效")
      : { kind: "anchor", fragment };
  }

  if (WINDOWS_ABSOLUTE_PATH_PATTERN.test(split.path) || split.path.startsWith("\\\\")) {
    return unsupported(raw, "不支持操作系统绝对路径");
  }

  const scheme = split.path.match(SCHEME_PATTERN)?.[0].slice(0, -1).toLowerCase();
  if (scheme) {
    if (scheme === "http" || scheme === "https" || scheme === "mailto" || scheme === "tel") {
      try {
        const url = new URL(raw);
        return { kind: "external", url: url.toString() };
      } catch {
        return unsupported(raw, "外部 URL 无效");
      }
    }
    if (scheme === "data") {
      return /^data:image\//i.test(raw)
        ? { kind: "external", url: raw }
        : unsupported(raw, "只允许兼容渲染 data:image 资源");
    }
    if (scheme === "blob") {
      return options.isSurfaceBlobUrl?.(raw)
        ? { kind: "external", url: raw }
        : unsupported(raw, "只允许 surface 创建的 blob URL");
    }
    return unsupported(raw, `不支持 ${scheme}: scheme`);
  }

  const rootRelative = split.path.startsWith("/");
  const rawPath = rootRelative ? split.path.slice(1) : split.path;
  const validPath = validateResourcePath(rawPath);
  if (!validPath.ok) return unsupported(raw, validPath.reason);

  const fragment = split.fragment === null ? null : decodeFragment(split.fragment);
  if (split.fragment !== null && fragment === null) return unsupported(raw, "资源 fragment 无效");

  return rootRelative
    ? { kind: "workspaceRootRelative", rawPath: validPath.path, query: split.query, fragment }
    : { kind: "documentRelative", rawPath: validPath.path, query: split.query, fragment };
}

function canonicalDocumentPath(documentPath: string): string | null {
  const parsed = parseEditorResourceReference(documentPath);
  if (parsed.kind !== "documentRelative") return null;
  if (parsed.query !== null || parsed.fragment !== null) return null;
  return normalizeWorkspacePath(parsed.rawPath, []);
}

function normalizeWorkspacePath(path: string, baseSegments: string[]): string | null {
  const segments = [...baseSegments];
  for (const segment of path.split("/")) {
    if (segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    if (!segment) return null;
    segments.push(segment);
  }
  return segments.join("/");
}

export function resolveEditorResourceReference(
  reference: EditorResourceReference,
  documentPath: string,
): EditorResolvedResourceReference {
  if (
    reference.kind === "anchor" ||
    reference.kind === "external" ||
    reference.kind === "unsupported"
  ) {
    return reference;
  }

  const canonicalPath = canonicalDocumentPath(documentPath);
  if (!canonicalPath) {
    return {
      kind: "unsupported",
      raw: documentPath,
      reason: "当前文档路径不是 canonical workspace path",
    };
  }
  const baseSegments =
    reference.kind === "documentRelative" ? canonicalPath.split("/").slice(0, -1) : [];
  const path = normalizeWorkspacePath(reference.rawPath, baseSegments);
  if (!path) {
    return { kind: "unsupported", raw: reference.rawPath, reason: "资源路径越过 Workspace root" };
  }
  return { kind: "workspaceFile", path, query: reference.query, fragment: reference.fragment };
}
