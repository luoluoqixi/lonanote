type AccentThemeDefinition = {
  accent: string;
  accentForeground: string;
  label: string;
};

export const accentThemeDefinitions = {
  mono: { accent: "#71717a", accentForeground: "#ffffff", label: "素色" },
  ocean: { accent: "#2563eb", accentForeground: "#ffffff", label: "海洋" },
  sakura: { accent: "#db2777", accentForeground: "#ffffff", label: "樱花" },
  lavender: { accent: "#7c3aed", accentForeground: "#ffffff", label: "薰衣草" },
  sunset: { accent: "#d97706", accentForeground: "#2b1700", label: "日落" },
  forest: { accent: "#059669", accentForeground: "#05312c", label: "森林" },
  ruby: { accent: "#e11d48", accentForeground: "#ffffff", label: "红宝石" },
  golden: { accent: "#ca8a04", accentForeground: "#3a2a00", label: "金耀" },
  aqua: { accent: "#0891b2", accentForeground: "#00313d", label: "水色" },
} as const satisfies Record<string, AccentThemeDefinition>;

export type AccentThemeName = keyof typeof accentThemeDefinitions;
export const accentThemeNames = Object.keys(accentThemeDefinitions) as AccentThemeName[];
export const defaultAccentThemeName: AccentThemeName = "ocean";

export function getAccentThemePreset(themeName: AccentThemeName) {
  return { ...accentThemeDefinitions[themeName], themeName };
}

export function normalizeAccentThemeName(value: unknown): AccentThemeName {
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
    if (value in aliases) return aliases[value];
    if (value in accentThemeDefinitions) return value as AccentThemeName;
  }
  return defaultAccentThemeName;
}
