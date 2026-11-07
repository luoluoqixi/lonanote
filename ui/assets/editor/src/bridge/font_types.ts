export type ResolvedFont = {
  family: string;
  faces: Array<{
    family: string;
    weight: number;
    italic: boolean;
    source: { kind: "local"; name: string } | { kind: "url"; url: string };
  }>;
};

export function isResolvedFont(value: unknown): value is ResolvedFont {
  if (!value || typeof value !== "object") return false;
  const font = value as ResolvedFont;
  if (
    typeof font.family !== "string" ||
    !font.family.trim() ||
    font.family.length > 512 ||
    !Array.isArray(font.faces) ||
    font.faces.length > 32
  )
    return false;
  return font.faces.every((face) => {
    if (
      !face ||
      typeof face.family !== "string" ||
      face.family !== font.family ||
      !Number.isInteger(face.weight) ||
      face.weight < 1 ||
      face.weight > 1000 ||
      typeof face.italic !== "boolean" ||
      !face.source
    )
      return false;
    if (face.source.kind === "local")
      return (
        typeof face.source.name === "string" &&
        !!face.source.name.trim() &&
        face.source.name.length <= 512
      );
    // 专用字体协议尚无其他资源来源；不接受任意 file/http/data URL。
    return (
      face.source.kind === "url" &&
      typeof face.source.url === "string" &&
      /^(?:lonanote-font:\/\/font\/|https?:\/\/lonanote-font\.localhost\/)[a-zA-Z0-9_-]+$/.test(
        face.source.url,
      )
    );
  });
}
