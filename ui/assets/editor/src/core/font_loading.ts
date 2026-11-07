import { type ResolvedFont, isResolvedFont } from "../bridge/font_types";

const loaded = new Map<string, Promise<void>>();

export function loadFont(font: ResolvedFont): Promise<void> {
  if (!isResolvedFont(font)) return Promise.reject(new Error("字体描述无效"));
  const key = JSON.stringify(font);
  const cached = loaded.get(key);
  if (cached) return cached;
  const request = (async () => {
    try {
      const faces = await Promise.all(
        font.faces.map((face) => {
          const source =
            face.source.kind === "local"
              ? `local(${JSON.stringify(face.source.name)})`
              : `url(${JSON.stringify(face.source.url)})`;
          return new FontFace(font.family, source, {
            weight: String(face.weight),
            style: face.italic ? "italic" : "normal",
          }).load();
        }),
      );
      for (const face of faces)
        (document.fonts as FontFaceSet & { add(face: FontFace): void }).add(face);
    } catch (error) {
      loaded.delete(key);
      throw error;
    }
  })();
  loaded.set(key, request);
  return request;
}
