import { createContext, useContext } from "react";

type BottomSheetStackHostContextValue = {
  onRequestClose: () => void;
};

const BottomSheetStackHostContext = createContext<BottomSheetStackHostContextValue | null>(null);

export function BottomSheetStackHostProvider({
  children,
  onRequestClose,
}: {
  children: React.ReactNode;
  onRequestClose: () => void;
}) {
  return (
    <BottomSheetStackHostContext.Provider value={{ onRequestClose }}>
      {children}
    </BottomSheetStackHostContext.Provider>
  );
}

export function useBottomSheetStackHost() {
  const value = useContext(BottomSheetStackHostContext);

  if (value == null) {
    throw new Error("useBottomSheetStackHost must be used within BottomSheetStackHost");
  }

  return value;
}
