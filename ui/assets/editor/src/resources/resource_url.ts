import type { EditorResourceContext } from "../bridge/protocol";
import {
  type EditorResourceReferenceOptions,
  parseEditorResourceReference,
  resolveEditorResourceReference,
} from "./resource_reference";

export function encodeWorkspaceResourcePath(path: string): string | null {
  if (!path || path.startsWith("/") || path.endsWith("/")) return null;
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}

export function appendWorkspaceResourceUrl(endpoint: string, path: string): string | null {
  const encodedPath = encodeWorkspaceResourcePath(path);
  if (!encodedPath || !endpoint || endpoint.includes("?") || endpoint.includes("#")) return null;
  return `${endpoint.replace(/\/+$/, "")}/${encodedPath}`;
}

/** 将 Markdown 本地引用改写为不暴露 Provider 信息的资源 URL。 */
export function resolveEditorResourceUrl(
  rawReference: string,
  context: EditorResourceContext,
  options: EditorResourceReferenceOptions = {},
): string | null {
  const reference = parseEditorResourceReference(rawReference, options);
  const resolved = context.available
    ? resolveEditorResourceReference(reference, context.documentPath)
    : reference;

  if (resolved.kind === "external") return resolved.url;
  if (resolved.kind !== "workspaceFile" || !context.available) return null;

  const url = appendWorkspaceResourceUrl(context.endpoint, resolved.path);
  if (!url) return null;
  const query = resolved.query === null ? "" : `?${resolved.query}`;
  const fragment = resolved.fragment === null ? "" : `#${encodeURIComponent(resolved.fragment)}`;
  return `${url}${query}${fragment}`;
}
