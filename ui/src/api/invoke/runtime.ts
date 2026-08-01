import { isMobile, isTauri, isWeb, os, systemLocale } from "../common/platform";

export { isTauri, isMobile, isWeb, os, systemLocale };

export function isInvokeAvailable(): boolean {
  return isTauri() || isMobile();
}
