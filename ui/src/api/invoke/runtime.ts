import { isMobile, isTauri, isWeb, os } from "../common/platform";

export { isTauri, isMobile, isWeb, os };

export function isInvokeAvailable(): boolean {
  return isTauri() || isMobile();
}
