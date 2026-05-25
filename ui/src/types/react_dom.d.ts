declare module "react-dom" {
  import type { ReactNode } from "react";

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
  ): ReactNode;
}
