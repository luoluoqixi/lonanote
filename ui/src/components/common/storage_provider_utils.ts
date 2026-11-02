import { StorageProviderId } from "@/api/commands";
import { os } from "@/api/common";

export function getStorageProviderLabel(providerId: StorageProviderId | null | undefined): string {
  if (!providerId) return "";
  const platform = os();
  switch (providerId) {
    case "app-local":
      switch (platform) {
        case "android":
          return "应用内部存储";
        case "ios":
          return "我的iPhone";
        case "windows":
          return "应用数据目录";
        case "macos":
          return "应用数据目录";
        case "linux":
          return "应用数据目录";
        default:
          return "app-local";
      }
    case "desktop-documents":
      switch (platform) {
        case "ios":
          return "文稿";
        case "windows":
          return "文档";
        default:
          return "Documents";
      }
    default:
      return providerId;
  }
}
