import type { FontSelection, ResolvedFont } from "@/api/commands/fonts/types";

import { sameFontSelection } from "./font_selection";

type FontState = {
  selection: FontSelection;
  font: ResolvedFont | null;
  loading: boolean;
  unavailable: boolean;
  error: string | null;
};
type Dependencies = {
  resolve(selection: NonNullable<FontSelection>): Promise<ResolvedFont>;
  load(font: ResolvedFont): Promise<void>;
};

export function createFontRuntime(deps: Dependencies) {
  let generation = 0;
  let observed = false;
  let state: FontState = {
    selection: null,
    font: null,
    loading: false,
    unavailable: false,
    error: null,
  };
  const listeners = new Set<() => void>();
  function publish(patch: Partial<FontState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }
  async function prepare(selection: FontSelection) {
    if (!selection) return null;
    const font = await deps.resolve(selection);
    await deps.load(font);
    return font;
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async observe(selection: FontSelection, refresh = false) {
      if (observed && !refresh && sameFontSelection(state.selection, selection)) return;
      observed = true;
      const request = ++generation;
      publish({ selection, loading: true, error: null });
      try {
        const font = await prepare(selection);
        if (generation === request) publish({ font, loading: false, unavailable: false });
      } catch (error) {
        if (generation === request)
          publish({ font: null, loading: false, unavailable: true, error: String(error) });
      }
    },
    async select(selection: FontSelection, save: (selection: FontSelection) => Promise<void>) {
      const request = ++generation;
      publish({ loading: true, error: null });
      try {
        const font = await prepare(selection);
        if (generation !== request) return;
        // 提交前切换身份，自己的 settings snapshot 不应取消本次加载结果。
        const previous = state.selection;
        observed = true;
        publish({ selection, font, unavailable: false });
        try {
          await save(selection);
        } catch (error) {
          if (generation === request) {
            observed = false;
            await this.observe(previous, true);
          }
          throw error;
        }
        if (generation === request) publish({ loading: false });
      } catch (error) {
        if (generation === request)
          publish({
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        throw error;
      }
    },
  };
}
