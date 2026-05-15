import { createContext, useContext } from "react";

export const WebLayerPortalContainerContext = createContext<HTMLElement | null>(null);

export function useWebLayerPortalContainer() {
  return useContext(WebLayerPortalContainerContext);
}
