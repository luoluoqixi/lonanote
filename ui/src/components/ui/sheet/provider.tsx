import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import type { ReactNode } from "react";

export function SheetProvider({ children }: { children: ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>;
}
