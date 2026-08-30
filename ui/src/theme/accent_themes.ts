import {
  accentThemeSeeds,
  accentThemeNames as kitAccentThemeNames,
  defaultAccentThemeName as kitDefaultAccentThemeName,
  resolveGeneratedAccentTheme,
} from "rn-ui-kit";

export { accentThemeSeeds };

type AccentThemeDefinition = {
  accent: string;
  accentForeground: string;
  label: string;
};

export const accentThemeNames = [...kitAccentThemeNames] as const;
export type AccentThemeName = (typeof accentThemeNames)[number];

const accentThemeLabels: Record<AccentThemeName, string> = {
  aqua: "水色",
  forest: "森林",
  golden: "金耀",
  lavender: "薰衣草",
  mono: "素色",
  ocean: "海洋",
  ruby: "红宝石",
  sakura: "樱花",
  sunset: "日落",
};

export const accentThemeDefinitions = Object.fromEntries(
  accentThemeNames.map((themeName) => [
    themeName,
    {
      accent: accentThemeSeeds[themeName],
      accentForeground: resolveGeneratedAccentTheme(accentThemeSeeds[themeName]).light
        .primaryForeground,
      label: accentThemeLabels[themeName],
    },
  ]),
) as Record<AccentThemeName, AccentThemeDefinition>;

export const defaultAccentThemeName: AccentThemeName = kitDefaultAccentThemeName as AccentThemeName;

const CUSTOM_ACCENT_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;

export function isCustomAccentColor(value: unknown): value is string {
  return typeof value === "string" && CUSTOM_ACCENT_COLOR.test(value.trim());
}

export function getAccentThemePreset(themeName: string) {
  if (isCustomAccentColor(themeName)) {
    const normalized = themeName.trim().toLowerCase();
    const generatedTheme = resolveGeneratedAccentTheme(normalized);
    return {
      accent: normalized,
      accentForeground: generatedTheme.light.primaryForeground,
      label: "自定义颜色",
      themeName: normalized,
    };
  }

  const normalizedThemeName = normalizeAccentThemeName(themeName);
  return {
    ...accentThemeDefinitions[normalizedThemeName as AccentThemeName],
    themeName: normalizedThemeName,
  };
}

export function normalizeAccentThemeName(value: unknown): string {
  const aliases: Record<string, AccentThemeName> = {
    blue: "ocean",
    emerald: "forest",
    orange: "sunset",
    rose: "ruby",
    success: "forest",
    warning: "sunset",
    error: "ruby",
  };
  if (typeof value === "string") {
    const normalized = value.trim();
    if (isCustomAccentColor(normalized)) return normalized.toLowerCase();
    if (normalized in aliases) return aliases[normalized];
    if (normalized in accentThemeDefinitions) return normalized;
  }
  return defaultAccentThemeName;
}
