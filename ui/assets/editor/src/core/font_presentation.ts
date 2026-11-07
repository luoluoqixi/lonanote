import type { ResolvedFont } from "../bridge/font_types";

export function fontFamilyStack(family: string): string {
  const name = /^(sans-serif|serif|monospace|system-ui)$/.test(family)
    ? family
    : JSON.stringify(family);
  return `${name}, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

export function createFontPresentation(deps: {
  load(font: ResolvedFont): Promise<void>;
  apply(family: string | null): void;
  measure(): void;
}) {
  let generation = 0;
  let previous: string | undefined;
  let requested: string | undefined;
  return {
    async applyFont(font: ResolvedFont | null) {
      const key = JSON.stringify(font);
      if (key === requested) return;
      const request = ++generation;
      requested = key;
      if (key === previous) return;
      try {
        if (font) await deps.load(font);
      } catch (error) {
        if (generation === request) requested = undefined;
        throw error;
      }
      if (request !== generation) return;
      deps.apply(font?.family ?? null);
      deps.measure();
      previous = key;
    },
    dispose() {
      generation++;
      previous = undefined;
      requested = undefined;
    },
  };
}
