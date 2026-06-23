import { createContext, useContext } from "react";

type TrueSheetStackHostContextValue = {
  onRequestClose: () => void;
};

const TrueSheetStackHostContext = createContext<TrueSheetStackHostContextValue | null>(null);

export function TrueSheetStackHostProvider({
  children,
  onRequestClose,
}: {
  children: React.ReactNode;
  onRequestClose: () => void;
}) {
  return (
    <TrueSheetStackHostContext.Provider value={{ onRequestClose }}>
      {children}
    </TrueSheetStackHostContext.Provider>
  );
}

export function useTrueSheetStackHost() {
  const value = useContext(TrueSheetStackHostContext);

  if (value == null) {
    throw new Error("useTrueSheetStackHost must be used within TrueSheetStackHost");
  }

  return value;
}
