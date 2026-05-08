import { Platform } from "react-native";

import type { OSType } from "./types";

const UNKNOWN: OSType = "unknown";

export function os(): OSType {
  const os = Platform.OS;
  if (os === "android" || os === "ios") return os;
  return UNKNOWN;
}
