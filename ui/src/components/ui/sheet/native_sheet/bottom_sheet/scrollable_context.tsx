import { createContext, useContext } from "react";

const BottomSheetScrollableContext = createContext(false);

export function BottomSheetScrollableProvider({ children }: { children: React.ReactNode }) {
  return (
    <BottomSheetScrollableContext.Provider value>{children}</BottomSheetScrollableContext.Provider>
  );
}

export function useBottomSheetScrollableContext() {
  return useContext(BottomSheetScrollableContext);
}
