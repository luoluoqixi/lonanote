import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

export type TrueSheetOverlayLayoutState = {
  /** 当前 detent 比例 0–1，默认 1（全高）。 */
  detent: number;
  /** TrueSheet `nativeEvent.position`：Sheet 顶边距屏幕顶部的 Y（px）。 */
  sheetTopPosition: number | null;
};

const defaultOverlayLayoutState: TrueSheetOverlayLayoutState = {
  detent: 1,
  sheetTopPosition: null,
};

const TrueSheetOverlayLayoutStateContext =
  createContext<TrueSheetOverlayLayoutState>(defaultOverlayLayoutState);

// eslint-disable-next-line no-spaced-func
const TrueSheetOverlayLayoutSetterContext = createContext<
  ((patch: Partial<TrueSheetOverlayLayoutState>) => void) | null
>(null);

/** 供 TrueSheet 宿主同步 detent / position，用于嵌套 Sheet 内 overlay 定位。 */
export function TrueSheetOverlayLayoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(defaultOverlayLayoutState);

  const setOverlayLayout = useCallback((patch: Partial<TrueSheetOverlayLayoutState>) => {
    setState((previous) => {
      const next = { ...previous, ...patch };
      if (next.detent === previous.detent && next.sheetTopPosition === previous.sheetTopPosition) {
        return previous;
      }
      return next;
    });
  }, []);

  const setter = useMemo(() => setOverlayLayout, [setOverlayLayout]);

  return (
    <TrueSheetOverlayLayoutSetterContext.Provider value={setter}>
      <TrueSheetOverlayLayoutStateContext.Provider value={state}>
        {children}
      </TrueSheetOverlayLayoutStateContext.Provider>
    </TrueSheetOverlayLayoutSetterContext.Provider>
  );
}

export function useTrueSheetOverlayLayout(): TrueSheetOverlayLayoutState {
  return useContext(TrueSheetOverlayLayoutStateContext);
}

export function useTrueSheetOverlayDetent(): number {
  return useTrueSheetOverlayLayout().detent;
}

export function useTrueSheetOverlaySheetTopPosition(): number | null {
  return useTrueSheetOverlayLayout().sheetTopPosition;
}

export function useTrueSheetOverlayLayoutSetter():
  | ((patch: Partial<TrueSheetOverlayLayoutState>) => void)
  | null {
  return useContext(TrueSheetOverlayLayoutSetterContext);
}
