import { isMobile, isTauri, isWeb, os } from "../common";

export { isTauri, isMobile, isWeb, os };

export function isInvokeAvailable(): boolean {
  return isTauri() || isMobile();
}
