import type { ReactNode } from "react";

import { ResolvedColorScheme } from "@/hooks/settings";

export interface UIProviderProps {
  children: ReactNode;
  colorScheme?: ResolvedColorScheme;
}

export interface RootProviderProps {
  children: ReactNode;
}
