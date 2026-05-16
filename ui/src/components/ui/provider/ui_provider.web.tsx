import { ToastProvider } from "@heroui/react";

import type { UIProviderProps } from "./types";

export function UIProvider({ children }: UIProviderProps) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}
