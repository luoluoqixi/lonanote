type RGBAColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toHexByte(value: number) {
  return clampByte(value).toString(16).padStart(2, "0").toUpperCase();
}

function hueToRgb(p: number, q: number, t: number) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function parseHexColor(value: string): RGBAColor | undefined {
  const hex = value.slice(1);

  if (hex.length === 3 || hex.length === 4) {
    const expanded = hex
      .split("")
      .map((char) => char + char)
      .join("");

    return parseHexColor(`#${expanded}`);
  }

  if (hex.length === 6 || hex.length === 8) {
    const hasAlpha = hex.length === 8;
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);
    const a = hasAlpha ? Number.parseInt(hex.slice(6, 8), 16) : 255;

    if ([r, g, b, a].some((channel) => Number.isNaN(channel))) {
      return undefined;
    }

    return { r, g, b, a };
  }

  return undefined;
}

function parseRgbColor(value: string): RGBAColor | undefined {
  const match = value.match(
    /^rgba?\s*\(\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*(?:,\s*([\d.]+))?\s*\)$/i,
  );

  if (!match) {
    return undefined;
  }

  const usesPercentage = value.includes("%");
  const r = usesPercentage
    ? (Number.parseFloat(match[1]) / 100) * 255
    : Number.parseFloat(match[1]);
  const g = usesPercentage
    ? (Number.parseFloat(match[2]) / 100) * 255
    : Number.parseFloat(match[2]);
  const b = usesPercentage
    ? (Number.parseFloat(match[3]) / 100) * 255
    : Number.parseFloat(match[3]);
  const alpha = match[4] != null ? Number.parseFloat(match[4]) * 255 : 255;

  return {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
    a: clampByte(alpha),
  };
}

function parseHslColor(value: string): RGBAColor | undefined {
  const match = value.match(
    /^hsla?\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*([\d.]+))?\s*\)$/i,
  );

  if (!match) {
    return undefined;
  }

  const h = ((((Number.parseFloat(match[1]) % 360) + 360) % 360) / 360) % 1;
  const saturation = Math.max(0, Math.min(1, Number.parseFloat(match[2]) / 100));
  const lightness = Math.max(0, Math.min(1, Number.parseFloat(match[3]) / 100));
  const alpha = match[4] != null ? Math.max(0, Math.min(1, Number.parseFloat(match[4]))) : 1;

  if (saturation === 0) {
    const channel = clampByte(lightness * 255);
    return { r: channel, g: channel, b: channel, a: clampByte(alpha * 255) };
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  return {
    r: clampByte(hueToRgb(p, q, h + 1 / 3) * 255),
    g: clampByte(hueToRgb(p, q, h) * 255),
    b: clampByte(hueToRgb(p, q, h - 1 / 3) * 255),
    a: clampByte(alpha * 255),
  };
}

function parseColor(value: unknown): RGBAColor | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.startsWith("#")) {
    return parseHexColor(trimmed);
  }

  if (/^rgba?\s*\(/i.test(trimmed)) {
    return parseRgbColor(trimmed);
  }

  if (/^hsla?\s*\(/i.test(trimmed)) {
    return parseHslColor(trimmed);
  }

  return undefined;
}

/**
 * 将 Tamagui / CSS 颜色值规范化为 SwiftUI `tint(...)` 更稳定可识别的 hex 字符串。
 * 对于已是命名色等无法解析的字符串，保留原值回退。
 */
export function toSwiftUIHexColor(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = parseColor(trimmed);

    if (!parsed) {
      return trimmed;
    }

    const hex = `#${toHexByte(parsed.r)}${toHexByte(parsed.g)}${toHexByte(parsed.b)}`;

    if (parsed.a === 255) {
      return hex;
    }

    return `${hex}${toHexByte(parsed.a)}`;
  }

  return undefined;
}
