import type { ReactNode } from "react";

import type { TreeInputIntent } from "./tree_types";

export type TreeInputProps = {
  children: ReactNode;
  activeDescendant?: string;
  onIntent: (intent: TreeInputIntent) => void;
};
