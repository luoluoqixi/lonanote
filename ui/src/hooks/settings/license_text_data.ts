import { readLicenseAsset } from "./license_asset";

export type LicenseScope = "direct" | "all";

export function createLicenseTextLoader(read: (scope: LicenseScope) => Promise<string>) {
  const cache = new Map<LicenseScope, Promise<string>>();
  return (scope: LicenseScope) => {
    if (!cache.has(scope)) {
      cache.set(
        scope,
        read(scope).catch((error) => {
          cache.delete(scope);
          throw error;
        }),
      );
    }
    return cache.get(scope)!;
  };
}

/** 静态 require 让 Metro 将两个 TXT 随包发布，不生成额外 JSON 或异步 JS bundle。 */
export const loadLicenseText = createLicenseTextLoader((scope) =>
  readLicenseAsset(
    scope === "direct"
      ? require("../../../assets/licenses/LICENSES.txt")
      : require("../../../assets/licenses/ALL_LICENSES.txt"),
  ),
);
