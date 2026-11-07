import type { FontSelection } from "@/api/commands/fonts/types";

const platforms = new Set(["windows", "macos", "linux", "android", "ios"]);

export function normalizeFontSelection(value: unknown): FontSelection {
  if (!value || typeof value !== "object") return null;
  const candidate = value as NonNullable<FontSelection>;
  if (
    !platforms.has(candidate.platform) ||
    typeof candidate.familyKey !== "string" ||
    !candidate.familyKey.trim() ||
    candidate.familyKey.length > 512 ||
    typeof candidate.displayName !== "string" ||
    !candidate.displayName.trim() ||
    candidate.displayName.length > 512
  )
    return null;
  return {
    platform: candidate.platform,
    familyKey: candidate.familyKey,
    displayName: candidate.displayName,
  };
}

export function sameFontSelection(a: FontSelection, b: FontSelection): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Expo 的原生字典只接受字符串，不能透传目录项中的能力对象。 */
export function fontSelectionIdentity(
  selection: NonNullable<FontSelection>,
): NonNullable<FontSelection> {
  const identity = normalizeFontSelection(selection);
  if (!identity) throw new Error("字体身份无效");
  return identity;
}
