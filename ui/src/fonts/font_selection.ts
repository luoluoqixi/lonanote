import type { FontSelection } from "@/api/commands/fonts/types";

const platforms = new Set(["windows", "macos", "linux", "android", "ios"]);

export function normalizeFontSelection(value: unknown): FontSelection {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.source === "bundled")
    return candidate.fontId === "fira-code" ? { source: "bundled", fontId: "fira-code" } : null;
  if (candidate.source !== undefined && candidate.source !== "system") return null;
  if (
    !platforms.has(String(candidate.platform)) ||
    typeof candidate.familyKey !== "string" ||
    !candidate.familyKey.trim() ||
    candidate.familyKey.length > 512 ||
    typeof candidate.displayName !== "string" ||
    !candidate.displayName.trim() ||
    candidate.displayName.length > 512
  )
    return null;
  return {
    source: "system",
    platform: candidate.platform as import("@/api/commands/fonts/types").FontPlatform,
    familyKey: candidate.familyKey,
    displayName: candidate.displayName,
  };
}

export function sameFontSelection(a: FontSelection, b: FontSelection): boolean {
  return JSON.stringify(normalizeFontSelection(a)) === JSON.stringify(normalizeFontSelection(b));
}

export function fontSelectionKey(selection: FontSelection): string {
  if (!selection) return "default";
  return selection.source === "bundled"
    ? `bundled:${selection.fontId}`
    : `system:${selection.platform}:${selection.familyKey}`;
}

export function fontSelectionName(selection: FontSelection): string {
  return !selection
    ? "系统默认"
    : selection.source === "bundled"
      ? "Fira Code"
      : selection.displayName;
}

/** 原生模块沿用三字符串 DTO，不接收来源标记和目录能力。 */
export function systemFontIdentity(
  selection: import("@/api/commands/fonts/types").SystemFontSelection,
) {
  const identity = normalizeFontSelection(selection);
  if (!identity || identity.source !== "system") throw new Error("不是本机字体");
  const { platform, familyKey, displayName } = identity;
  return { platform, familyKey, displayName };
}

/** Expo 的原生字典只接受字符串，不能透传目录项中的能力对象。 */
export function fontSelectionIdentity(
  selection: NonNullable<FontSelection>,
): NonNullable<FontSelection> {
  const identity = normalizeFontSelection(selection);
  if (!identity) throw new Error("字体身份无效");
  return identity;
}
